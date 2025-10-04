#!/usr/bin/env python3
"""
Surf Database Tides Update Script
Pulls 7-day hourly tide data for all beaches and stores into beach_tides_hourly.
Applies +2.4 ft adjustment to tide level.
"""

import logging
import sys
import os
import time
from datetime import datetime, timedelta
import math

import openmeteo_requests
import pandas as pd
import requests_cache
from retry_requests import retry
import pytz
import numpy as np
from supabase import create_client, Client

# === CONFIGURATION ===
SUPABASE_URL = "https://wborkytqlmkcgwzhsoiz.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indib3JreXRxbG1rY2d3emhzb2l6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxMTMxNDcsImV4cCI6MjA2OTY4OTE0N30.9kRB3eSEL_N37dy6FjGfNJEDBiCXam9nepDLowCCxk0"


DAYS_FORECAST = 7
BATCH_SIZE = 10
UPSERT_CHUNK = 1000
MAX_WORKERS = 3
LOG_LEVEL = logging.INFO
API_DELAY = 2.0
RETRY_DELAY = 65
MAX_RETRIES = 3
TIDE_ADJUSTMENT_FT = 2.4

# === LOGGING ===
logging.basicConfig(
    level=LOG_LEVEL,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

# === DB + API SETUP ===
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

cache_session = requests_cache.CachedSession(".cache", expire_after=3600)
retry_session = retry(cache_session, retries=3, backoff_factor=0.2)
openmeteo = openmeteo_requests.Client(session=retry_session)

# === HELPERS ===
def meters_to_feet(m):
    return m * 3.28084 if m is not None else None

def safe_float(x):
    try:
        if x is None: return None
        v = float(x)
        return v if np.isfinite(v) else None
    except Exception:
        return None

def valid_coord(x):
    return x is not None and not (isinstance(x, float) and math.isnan(x))

def chunk_iter(seq, n):
    for i in range(0, len(seq), n):
        yield seq[i:i+n]

def to_local_timestamps(start_unix, end_unix, interval_sec, tz_str="America/Los_Angeles"):
    start = pd.to_datetime(start_unix, unit="s", utc=True).tz_convert(tz_str)
    end = pd.to_datetime(end_unix, unit="s", utc=True).tz_convert(tz_str)
    # Pandas >= 1.4 uses 'inclusive'; older versions use 'closed'.
    freq = pd.Timedelta(seconds=interval_sec)
    try:
        return pd.date_range(start=start, end=end, freq=freq, inclusive="left")
    except TypeError:
        # Fallback for older pandas that don't support 'inclusive'
        return pd.date_range(start=start, end=end, freq=freq, closed="left")

# === FETCH BEACHES ===
def fetch_all_beaches():
    logger.info("Fetching beaches...")
    all_rows = []
    start = 0
    while True:
        resp = (
            supabase.table("beaches")
            .select("id,Name,LATITUDE,LONGITUDE", count="exact")
            .range(start, start+999)
            .execute()
        )
        rows = resp.data or []
        all_rows.extend(rows)
        if len(rows) < 1000: break
        start += 1000

    beaches = [
        {"id": b["id"], "Name": b["Name"], "LATITUDE": b["LATITUDE"], "LONGITUDE": b["LONGITUDE"]}
        for b in all_rows if valid_coord(b.get("LATITUDE")) and valid_coord(b.get("LONGITUDE"))
    ]
    logger.info(f"Found {len(beaches)} beaches with valid coords")
    return beaches

# === UPDATE TIDES ===
def update_tides(beaches):
    tz = pytz.timezone("America/Los_Angeles")
    today = datetime.now(tz).strftime("%Y-%m-%d")
    end = (datetime.now(tz) + timedelta(days=DAYS_FORECAST)).strftime("%Y-%m-%d")

    total_inserted = 0
    for batch in chunk_iter(beaches, BATCH_SIZE):
        ids = [b["id"] for b in batch]
        lats = [b["LATITUDE"] for b in batch]
        lons = [b["LONGITUDE"] for b in batch]

        logger.info(f"Fetching tide data for {len(batch)} beaches...")

        marine_url = "https://marine-api.open-meteo.com/v1/marine"
        marine_params = {
            "latitude": lats,
            "longitude": lons,
            "hourly": ["sea_level_height_msl"],
            "timezone": "America/Los_Angeles",
            "start_date": today,
            "end_date": end
        }

        responses = openmeteo.weather_api(marine_url, params=marine_params)

        rows = []
        for i, resp in enumerate(responses):
            try:
                hourly = resp.Hourly()
                tide_m = hourly.Variables(0).ValuesAsNumpy()
                timestamps = to_local_timestamps(
                    start_unix=hourly.Time(),
                    end_unix=hourly.TimeEnd(),
                    interval_sec=hourly.Interval(),
                    tz_str="America/Los_Angeles"
                )

                for j, ts in enumerate(timestamps):
                    raw_m = safe_float(tide_m[j])
                    raw_ft = safe_float(meters_to_feet(raw_m))
                    adj_ft = raw_ft + TIDE_ADJUSTMENT_FT if raw_ft is not None else None
                    rows.append({
                        "beach_id": ids[i],
                        "timestamp": pd.Timestamp(ts).isoformat(),
                        "tide_level_ft": adj_ft,
                        "tide_level_m": raw_m,
                        "source": "open-meteo"
                    })
            except Exception as e:
                logger.error(f"Error processing beach {ids[i]}: {e}")

        if rows:
            for chunk in chunk_iter(rows, UPSERT_CHUNK):
                supabase.table("beach_tides_hourly").upsert(
                    chunk, on_conflict="beach_id,timestamp"
                ).execute()
                total_inserted += len(chunk)

        logger.info(f"Inserted {len(rows)} tide rows in batch")

        time.sleep(API_DELAY)

    logger.info(f"Completed tides update: {total_inserted} rows")
    return total_inserted

# === MAIN ===
def main():
    beaches = fetch_all_beaches()
    if not beaches:
        logger.error("No beaches found")
        return False
    update_tides(beaches)
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
