#!/usr/bin/env python3
"""
Surf DB Partial Update Script — ONLY fills:
  temperature, weather, wind_gust_mph, water_temp_f, pressure_inhg, tide_level_ft
Keeps your batching/retries/timezone logic. Uses Open-Meteo weather & marine.
Units: mph, °F, inHg, ft
"""

import urllib.request
import urllib.error
import json
import logging
import sys
import os
from datetime import datetime, timedelta, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed
import math
import time

import openmeteo_requests
import pandas as pd
import requests_cache
from retry_requests import retry
import pytz
import numpy as np
from supabase import create_client, Client

# === CONFIG ===
SUPABASE_URL = "https://wborkytqlmkcgwzhsoiz.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indib3JreXRxbG1rY2d3emhzb2l6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxMTMxNDcsImV4cCI6MjA2OTY4OTE0N30.9kRB3eSEL_N37dy6FjGfNJEDBiCXam9nepDLowCCxk0"

DAYS_FORECAST = 7
BATCH_SIZE = 10
UPSERT_CHUNK = 3000
MAX_WORKERS = 3
LOG_LEVEL = logging.INFO
API_DELAY = 2.0
RETRY_DELAY = 65
MAX_RETRIES = 3

# Tide adjustment (+2.4 ft)
TIDE_ADJUSTMENT_FT = 2.4

if sys.platform == "win32":
    os.environ["PYTHONIOENCODING"] = "utf-8"

# === LOGGING ===
logging.basicConfig(
    level=LOG_LEVEL,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.FileHandler('surf_partial_update.log', encoding='utf-8'),
              logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

# === DB + API CLIENTS ===
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

cache_session = requests_cache.CachedSession(".cache", expire_after=3600)
retry_session = retry(cache_session, retries=3, backoff_factor=0.2)
openmeteo = openmeteo_requests.Client(session=retry_session)

# === UTILS ===
def safe_api_delay():
    time.sleep(API_DELAY)

def api_request_with_retry(api_func, *args, max_retries=MAX_RETRIES, **kwargs):
    for attempt in range(max_retries + 1):
        try:
            return api_func(*args, **kwargs)
        except Exception as e:
            s = str(e).lower()
            if ('rate limit' in s or 'limit exceeded' in s or 'try again' in s) and attempt < max_retries:
                wait_time = RETRY_DELAY * (attempt + 1)
                logger.warning(f"RATE LIMITED (attempt {attempt+1}/{max_retries+1}). Waiting {wait_time}s...")
                time.sleep(wait_time)
                continue
            raise

def valid_coord(x):
    try:
        return x is not None and not (isinstance(x, float) and math.isnan(x))
    except Exception:
        return False

def safe_float(x):
    try:
        if x is None:
            return None
        v = float(x)
        return v if np.isfinite(v) else None
    except Exception:
        return None

def safe_int(x):
    try:
        if x is None:
            return None
        return int(x)
    except Exception:
        return None

def meters_to_feet(m):
    if m is None:
        return None
    return m * 3.28084

def c_to_f(c):
    if c is None:
        return None
    return (c * 9/5) + 32

def kph_to_mph(kph):
    if kph is None:
        return None
    return kph * 0.621371

def hpa_to_inhg(hpa):
    if hpa is None:
        return None
    return hpa * 0.02953

def chunk_iter(seq, n):
    for i in range(0, len(seq), n):
        yield seq[i:i+n]

def to_local_timestamps(start_unix, end_unix, interval_sec, tz_str="America/Los_Angeles"):
    start = pd.to_datetime(start_unix, unit="s", utc=True).tz_convert(tz_str)
    end_ = pd.to_datetime(end_unix, unit="s", utc=True).tz_convert(tz_str)
    return pd.date_range(start=start, end=end_, freq=pd.Timedelta(seconds=interval_sec), inclusive="left")

# === DATA FETCH ===
def fetch_all_beaches(page_size: int = 1000):
    logger.info("STEP 1: Fetching beach list…")
    all_rows, start = [], 0
    while True:
        try:
            end_idx = start + page_size - 1
            resp = (supabase.table("beaches")
                    .select("id,Name,LATITUDE,LONGITUDE", count="exact")
                    .range(start, end_idx).execute())
            rows = resp.data or []
            all_rows.extend(rows)
            if len(rows) < page_size:
                break
            start += page_size
        except Exception as e:
            logger.error(f"Error fetching beaches: {e}")
            break

    beaches = [{"id": b["id"], "Name": b["Name"], "LATITUDE": b["LATITUDE"], "LONGITUDE": b["LONGITUDE"]}
               for b in all_rows if valid_coord(b.get("LATITUDE")) and valid_coord(b.get("LONGITUDE"))]
    logger.info(f"OK: {len(beaches)} beaches with valid coords (total: {len(all_rows)})")
    return beaches

# === PARTIAL UPDATE ===
def update_target_fields(beaches):
    """
    For each beach & hour in [today, today+7), fetch only the signals needed to fill:
      temperature (F), weather (code), wind_gust_mph, water_temp_f, pressure_inhg, tide_level_ft
    Upsert with on_conflict=(beach_id, timestamp) providing ONLY these columns.
    """
    logger.info("STEP 2: Updating ONLY selected columns…")

    tz = pytz.timezone("America/Los_Angeles")
    start_date = datetime.now(tz).strftime("%Y-%m-%d")
    end_date = (datetime.now(tz) + timedelta(days=DAYS_FORECAST)).strftime("%Y-%m-%d")
    logger.info(f"   Date window: {start_date} ➜ {end_date}")

    total_rows, batch_idx = 0, 0
    total_batches = len(list(chunk_iter(beaches, BATCH_SIZE)))

    for batch in chunk_iter(beaches, BATCH_SIZE):
        batch_idx += 1
        ids = [b["id"] for b in batch]
        lats = [b["LATITUDE"] for b in batch]
        lons = [b["LONGITUDE"] for b in batch]
        logger.info(f"   Batch {batch_idx}/{total_batches}: {len(batch)} beaches")

        if batch_idx > 1:
            safe_api_delay()

        # Weather: gusts, temp, pressure, weather_code
        weather_url = "https://api.open-meteo.com/v1/forecast"
        weather_params = {
            "latitude": lats,
            "longitude": lons,
            "hourly": [
                "windgusts_10m",   # kph
                "temperature_2m",  # C
                "pressure_msl",    # hPa
                "weather_code"     # int
            ],
            "timezone": "America/Los_Angeles",
            "start_date": start_date,
            "end_date": end_date
        }
        logger.info("      Fetching weather…")
        w_resps = api_request_with_retry(openmeteo.weather_api, weather_url, params=weather_params)

        time.sleep(1)

        # Marine: sea surface temp, tide level (sea_level_height_msl)
        marine_url = "https://marine-api.open-meteo.com/v1/marine"
        marine_params = {
            "latitude": lats,
            "longitude": lons,
            "hourly": [
                "sea_surface_temperature",  # C
                "sea_level_height_msl"      # meters
            ],
            "timezone": "America/Los_Angeles",
            "start_date": start_date,
            "end_date": end_date
        }
        logger.info("      Fetching marine…")
        m_resps = api_request_with_retry(openmeteo.weather_api, marine_url, params=marine_params)

        if len(w_resps) != len(m_resps) or len(w_resps) != len(batch):
            logger.warning("      Response count mismatch; skipping this batch.")
            continue

        rows = []
        for i in range(len(batch)):
            beach_id = ids[i]
            try:
                w_hr = w_resps[i].Hourly()
                m_hr = m_resps[i].Hourly()

                timestamps = to_local_timestamps(
                    start_unix=w_resps[i].Hourly().Time(),
                    end_unix=w_resps[i].Hourly().TimeEnd(),
                    interval_sec=w_resps[i].Hourly().Interval(),
                    tz_str="America/Los_Angeles"
                )

                wind_gust_kph = w_hr.Variables(0).ValuesAsNumpy()
                temp_c       = w_hr.Variables(1).ValuesAsNumpy()
                pressure_hpa = w_hr.Variables(2).ValuesAsNumpy()
                weather_code = w_hr.Variables(3).ValuesAsNumpy()

                water_temp_c = m_hr.Variables(0).ValuesAsNumpy()
                tide_level_m = m_hr.Variables(1).ValuesAsNumpy()

                n = min(len(timestamps),
                        len(wind_gust_kph), len(temp_c), len(pressure_hpa), len(weather_code),
                        len(water_temp_c), len(tide_level_m))

                for j in range(n):
                    # Build *only* the 6 fields + keys
                    rec = {
                        "beach_id": beach_id,
                        "timestamp": pd.Timestamp(timestamps[j]).isoformat(),

                        "temperature": safe_float(c_to_f(temp_c[j])),
                        "weather": safe_int(weather_code[j]),
                        "wind_gust_mph": safe_float(kph_to_mph(wind_gust_kph[j])),
                        "water_temp_f": safe_float(c_to_f(water_temp_c[j])),
                        "pressure_inhg": safe_float(hpa_to_inhg(pressure_hpa[j])),
                        "tide_level_ft": None
                    }

                    # tide in ft with +2.4 ft adjustment
                    raw_tide_ft = safe_float(meters_to_feet(tide_level_m[j]))
                    if raw_tide_ft is not None:
                        rec["tide_level_ft"] = raw_tide_ft + TIDE_ADJUSTMENT_FT

                    rows.append(rec)

            except Exception as e:
                logger.error(f"      Error processing beach_id={beach_id}: {e}")

        if rows:
            for chunk in chunk_iter(rows, UPSERT_CHUNK):
                try:
                    # Upsert ONLY these columns. Existing other columns untouched.
                    supabase.table("forecast_data").upsert(
                        chunk,
                        on_conflict="beach_id,timestamp"
                    ).execute()
                    total_rows += len(chunk)
                except Exception as e:
                    logger.error(f"      Upsert error (chunk): {e}")

        logger.info(f"      OK batch {batch_idx}: upserted {len(rows)} hourly records (only target fields).")

    logger.info(f"STEP 3: Done. Total rows upserted (partial fields): {total_rows}")
    return total_rows



def main():
    t0 = time.time()
    logger.info("Starting PARTIAL update (temperature, weather, gusts, water temp, pressure, tide)…")
    logger.info(f"Tide adjustment applied: +{TIDE_ADJUSTMENT_FT} ft")

    try:
        beaches = fetch_all_beaches()
        if not beaches:
            logger.error("No beaches found. Abort.")
            return False

        count = update_target_fields(beaches)

        dt = time.time() - t0
        logger.info("SUCCESS: Partial field fill complete.")
        logger.info(f"   Beaches processed: {len(beaches)}")
        logger.info(f"   Hourly rows upserted: {count}")
        logger.info(f"   Elapsed: {dt:.1f}s")
        return True
    except Exception as e:
        logger.error(f"CRITICAL: {e}")
        return False

if __name__ == "__main__":
    ok = main()
    sys.exit(0 if ok else 1)
