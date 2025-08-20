#!/usr/bin/env python3
"""
Surf Database Update Script - IMPERIAL UNITS VERSION
Deletes old forecast data and refreshes with new 7-day forecasts.
Uses imperial units: mph, feet, Fahrenheit
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

# === CONFIGURATION ===
SUPABASE_URL = "https://wborkytqlmkcgwzhsoiz.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indib3JreXRxbG1rY2d3emhzb2l6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxMTMxNDcsImV4cCI6MjA2OTY4OTE0N30.9kRB3eSEL_N37dy6FjGfNJEDBiCXam9nepDLowCCxk0"
VC_API_KEY = "NFYFM562X2PY2M4W4GE8WZZGC"

# Script settings with rate limiting
DAYS_FORECAST = 7
BATCH_SIZE = 10           # Reduced from 20 to be gentler on API
UPSERT_CHUNK = 3000
MAX_WORKERS = 3           # Reduced from 5 for county requests
LOG_LEVEL = logging.INFO
API_DELAY = 2.0           # Seconds to wait between API calls
RETRY_DELAY = 65          # Seconds to wait when rate limited
MAX_RETRIES = 3           # Maximum retry attempts

# Fix for Windows console encoding
if sys.platform == "win32":
    os.environ["PYTHONIOENCODING"] = "utf-8"

# === LOGGING SETUP ===
logging.basicConfig(
    level=LOG_LEVEL,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('surf_update.log', encoding='utf-8'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# === DATABASE SETUP ===
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# === WEATHER API SETUP ===
cache_session = requests_cache.CachedSession(".cache", expire_after=3600)
retry_session = retry(cache_session, retries=3, backoff_factor=0.2)
openmeteo = openmeteo_requests.Client(session=retry_session)

# === UNIT CONVERSION FUNCTIONS ===
def celsius_to_fahrenheit(celsius):
    """Convert Celsius to Fahrenheit."""
    if celsius is None:
        return None
    return (celsius * 9/5) + 32

def kph_to_mph(kph):
    """Convert km/h to mph."""
    if kph is None:
        return None
    return kph * 0.621371

def meters_to_feet(meters):
    """Convert meters to feet."""
    if meters is None:
        return None
    return meters * 3.28084

def hpa_to_inhg(hpa):
    """Convert hectopascals (hPa) to inches of mercury (inHg)."""
    if hpa is None:
        return None
    return hpa * 0.02953

# === UTILITY FUNCTIONS ===
def log_step(message: str, step_num: int = None):
    """Log a major step with formatting."""
    if step_num:
        logger.info(f"STEP {step_num}: {message}")
    else:
        logger.info(f"OK: {message}")

def api_request_with_retry(api_func, *args, max_retries=MAX_RETRIES, **kwargs):
    """Make API request with retry logic for rate limiting."""
    for attempt in range(max_retries + 1):
        try:
            result = api_func(*args, **kwargs)
            return result
        except Exception as e:
            error_str = str(e).lower()
            
            # Check if it's a rate limit error
            if 'rate limit' in error_str or 'limit exceeded' in error_str or 'try again' in error_str:
                if attempt < max_retries:
                    wait_time = RETRY_DELAY * (attempt + 1)  # Exponential backoff
                    logger.warning(f"RATE LIMITED (attempt {attempt + 1}/{max_retries + 1}). Waiting {wait_time}s...")
                    time.sleep(wait_time)
                    continue
                else:
                    logger.error(f"ERROR: Rate limit exceeded after {max_retries + 1} attempts")
                    raise e
            else:
                # Not a rate limit error, don't retry
                raise e
    
    raise Exception("Max retries exceeded")

def safe_api_delay():
    """Add a small delay between API calls to be respectful."""
    time.sleep(API_DELAY)

def valid_coord(x):
    """Check if coordinate is valid (not None, not NaN)."""
    try:
        return x is not None and not (isinstance(x, float) and math.isnan(x))
    except Exception:
        return False

def safe_float(x):
    """Convert to float; return None for NaN/Inf or unparseable values."""
    try:
        if x is None:
            return None
        v = float(x)
        return v if np.isfinite(v) else None
    except Exception:
        return None

def safe_int(x):
    """Convert to int; return None for NaN/Inf or unparseable values."""
    try:
        if x is None:
            return None
        if np.isfinite(x):
            return int(x)
        return None
    except Exception:
        return None

def chunk_iter(seq, n):
    """Split sequence into chunks of size n."""
    for i in range(0, len(seq), n):
        yield seq[i:i+n]

def nonempty_record(record, exclude_keys=("beach_id", "timestamp")):
    """Return True if at least one non-excluded field is not None."""
    for k, v in record.items():
        if k in exclude_keys:
            continue
        if v is not None:
            return True
    return False

def to_local_timestamps(start_unix, end_unix, interval_sec, tz_str="America/Los_Angeles"):
    """Build timezone-aware hourly index matching Open-Meteo arrays."""
    start = pd.to_datetime(start_unix, unit="s", utc=True).tz_convert(tz_str)
    end_ = pd.to_datetime(end_unix, unit="s", utc=True).tz_convert(tz_str)
    return pd.date_range(start=start, end=end_, freq=pd.Timedelta(seconds=interval_sec), inclusive="left")

# === DATABASE OPERATIONS ===
def cleanup_old_data():
    """Delete all existing forecast and daily condition data."""
    log_step("Cleaning up old data", 1)
    
    try:
        # Method 1: Try to delete forecast data using date range
        logger.info("DELETE: Deleting old forecast data...")
        try:
            # Delete anything older than yesterday to avoid conflicts
            yesterday = (datetime.now() - timedelta(days=1)).isoformat()
            
            # Try deleting by timestamp first (more efficient)
            forecast_delete = supabase.table("forecast_data").delete().lt('timestamp', yesterday).execute()
            logger.info("   Deleted old forecast data by timestamp")
            
            # Also delete future data to ensure clean slate
            future_delete = supabase.table("forecast_data").delete().gte('timestamp', yesterday).execute()
            logger.info("   Deleted future forecast data")
            
        except Exception as e:
            logger.warning(f"   Timestamp-based deletion failed: {e}")
            # Fallback: try to get and delete by IDs
            try:
                forecast_ids_response = supabase.table("forecast_data").select("id").limit(10000).execute()
                if forecast_ids_response.data:
                    logger.info(f"   Found {len(forecast_ids_response.data)} forecast records to delete")
                    # Delete in smaller chunks to avoid timeout
                    for chunk in chunk_iter([row['id'] for row in forecast_ids_response.data], 500):
                        supabase.table("forecast_data").delete().in_("id", chunk).execute()
                    logger.info("   Forecast data deleted by ID")
                else:
                    logger.info("   No forecast data to delete")
            except Exception as e2:
                logger.warning(f"   ID-based deletion also failed: {e2}")
                logger.info("   Will use UPSERT to handle conflicts")
        
        # Delete old daily conditions  
        logger.info("DELETE: Deleting old daily conditions...")
        try:
            # Delete by date range
            yesterday_date = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
            daily_delete = supabase.table("daily_county_conditions").delete().lt('date', yesterday_date).execute()
            future_daily_delete = supabase.table("daily_county_conditions").delete().gte('date', yesterday_date).execute()
            logger.info("   Daily conditions deleted successfully")
        except Exception as e:
            logger.warning(f"   Daily conditions deletion failed: {e}")
            # Fallback method
            try:
                daily_ids_response = supabase.table("daily_county_conditions").select("id").limit(1000).execute()
                if daily_ids_response.data:
                    logger.info(f"   Found {len(daily_ids_response.data)} daily records to delete")
                    for chunk in chunk_iter([row['id'] for row in daily_ids_response.data], 100):
                        supabase.table("daily_county_conditions").delete().in_("id", chunk).execute()
                    logger.info("   Daily conditions deleted by ID")
                else:
                    logger.info("   No daily conditions to delete")
            except Exception as e2:
                logger.warning(f"   Daily conditions ID-based deletion failed: {e2}")
                logger.info("   Will use UPSERT to handle conflicts")
        
        log_step("Old data cleanup completed (or will use UPSERT for conflicts)")
        return True
        
    except Exception as e:
        logger.error(f"ERROR: Error during cleanup: {e}")
        # Don't fail the entire script if cleanup fails - UPSERT will handle duplicates
        logger.warning("Continuing with UPSERT mode to handle any conflicts...")
        return True

def fetch_all_beaches(page_size: int = 1000):
    """Paginate through the beaches table and return list of dicts with required columns."""
    log_step("Fetching beach data", 2)
    
    all_rows = []
    start = 0
    while True:
        try:
            end_idx = start + page_size - 1
            resp = (
                supabase
                .table("beaches")
                .select("id,Name,LATITUDE,LONGITUDE", count="exact")
                .range(start, end_idx)
                .execute()
            )
            rows = resp.data or []
            all_rows.extend(rows)
            
            logger.info(f"   Fetched {len(rows)} beaches (batch {start//page_size + 1})")
            
            if len(rows) < page_size:
                break
            start += page_size
            
        except Exception as e:
            logger.error(f"ERROR: Error fetching beaches: {e}")
            break
    
    # Filter for valid coordinates
    valid_beaches = [
        {"id": b["id"], "Name": b["Name"], "LATITUDE": b["LATITUDE"], "LONGITUDE": b["LONGITUDE"]}
        for b in all_rows
        if valid_coord(b.get("LATITUDE")) and valid_coord(b.get("LONGITUDE"))
    ]
    
    log_step(f"Found {len(valid_beaches)} beaches with valid coordinates (total: {len(all_rows)})")
    return valid_beaches

def fetch_all_counties(page_size: int = 1000):
    """Get unique counties with their centroid coordinates."""
    log_step("Calculating county centroids", 3)
    
    all_rows = []
    start = 0
    while True:
        try:
            end_idx = start + page_size - 1
            resp = (
                supabase
                .table("beaches")
                .select("COUNTY,LATITUDE,LONGITUDE", count="exact")
                .range(start, end_idx)
                .execute()
            )
            rows = resp.data or []
            all_rows.extend(rows)
            if len(rows) < page_size:
                break
            start += page_size
        except Exception as e:
            logger.error(f"ERROR: Error fetching county data: {e}")
            break
    
    # Group by county and calculate centroid coordinates
    county_data = {}
    for row in all_rows:
        county = row.get("COUNTY")
        lat = row.get("LATITUDE")
        lon = row.get("LONGITUDE")
        
        if county and valid_coord(lat) and valid_coord(lon):
            if county not in county_data:
                county_data[county] = {"lats": [], "lons": []}
            county_data[county]["lats"].append(lat)
            county_data[county]["lons"].append(lon)
    
    # Calculate centroids
    counties = []
    for county, coords in county_data.items():
        centroid_lat = sum(coords["lats"]) / len(coords["lats"])
        centroid_lon = sum(coords["lons"]) / len(coords["lons"])
        counties.append({
            "county": county,
            "latitude": centroid_lat,
            "longitude": centroid_lon,
            "beach_count": len(coords["lats"])
        })
    
    log_step(f"Calculated centroids for {len(counties)} counties")
    return counties

def update_forecast_data(beaches):
    """Update forecast data for all beaches with imperial units."""
    log_step("Updating forecast data", 4)
    
    # Date range
    tz = pytz.timezone("America/Los_Angeles")
    today = datetime.now(tz).strftime("%Y-%m-%d")
    end = (datetime.now(tz) + timedelta(days=DAYS_FORECAST)).strftime("%Y-%m-%d")
    
    logger.info(f"   Fetching forecasts from {today} to {end}")
    
    total_inserted = 0
    processed_beaches = 0
    batch_count = 0
    total_batches = len(list(chunk_iter(beaches, BATCH_SIZE)))
    
    for batch in chunk_iter(beaches, BATCH_SIZE):
        batch_count += 1
        try:
            batch_start = time.time()
            ids = [b["id"] for b in batch]
            names = [b["Name"] for b in batch]
            lats = [b["LATITUDE"] for b in batch]
            lons = [b["LONGITUDE"] for b in batch]

            logger.info(f"   Processing batch {batch_count}/{total_batches} ({len(batch)} beaches)...")

            # Add delay before API calls (except first batch)
            if batch_count > 1:
                logger.info(f"   Waiting {API_DELAY}s to respect API limits...")
                safe_api_delay()

            # Weather API call with retry - NOW INCLUDING WEATHER_CODE
            weather_url = "https://api.open-meteo.com/v1/forecast"
            weather_params = {
                "latitude": lats,
                "longitude": lons,
                "hourly": [
                    "windspeed_10m", "windgusts_10m", "winddirection_10m",
                    "temperature_2m", "pressure_msl", "weather_code"  # ADDED WEATHER_CODE
                ],
                "timezone": "America/Los_Angeles",
                "start_date": today,
                "end_date": end
            }
            
            logger.info(f"   Fetching weather data...")
            weather_responses = api_request_with_retry(
                openmeteo.weather_api, 
                weather_url, 
                params=weather_params
            )

            # Small delay between weather and marine API
            time.sleep(1)

            # Marine API call with retry
            marine_url = "https://marine-api.open-meteo.com/v1/marine"
            marine_params = {
                "latitude": lats,
                "longitude": lons,
                "hourly": [
                    "swell_wave_height", "swell_wave_period", "swell_wave_direction",
                    "secondary_swell_wave_height", "secondary_swell_wave_period", "secondary_swell_wave_direction",
                    "wave_height", "sea_surface_temperature", "sea_level_height_msl"
                ],
                "timezone": "America/Los_Angeles",
                "start_date": today,
                "end_date": end
            }
            
            logger.info(f"   Fetching marine data...")
            marine_responses = api_request_with_retry(
                openmeteo.weather_api,
                marine_url,
                params=marine_params
            )

            # Process responses
            if len(weather_responses) != len(marine_responses) or len(weather_responses) != len(batch):
                logger.warning(f"WARNING: Response count mismatch for batch {batch_count}, skipping")
                continue

            logger.info(f"   Processing {len(batch)} beaches data...")
            rows = []
            for i in range(len(batch)):
                beach_id = ids[i]
                name = names[i]
                try:
                    wr = weather_responses[i].Hourly()
                    mr = marine_responses[i].Hourly()

                    timestamps = to_local_timestamps(
                        start_unix=weather_responses[i].Hourly().Time(),
                        end_unix=weather_responses[i].Hourly().TimeEnd(),
                        interval_sec=weather_responses[i].Hourly().Interval(),
                        tz_str="America/Los_Angeles"
                    )

                    # Extract data arrays - WEATHER NOW HAS 6 VARIABLES
                    wind_speed_kph = wr.Variables(0).ValuesAsNumpy()
                    wind_gust_kph = wr.Variables(1).ValuesAsNumpy()
                    wind_dir_deg = wr.Variables(2).ValuesAsNumpy()
                    temp_2m_c = wr.Variables(3).ValuesAsNumpy()
                    pressure_hpa = wr.Variables(4).ValuesAsNumpy()
                    weather_code = wr.Variables(5).ValuesAsNumpy()  # NEW: Weather code

                    pri_swell_h_m = mr.Variables(0).ValuesAsNumpy()
                    pri_swell_p = mr.Variables(1).ValuesAsNumpy()
                    pri_swell_dir = mr.Variables(2).ValuesAsNumpy()
                    sec_swell_h_m = mr.Variables(3).ValuesAsNumpy()
                    sec_swell_p = mr.Variables(4).ValuesAsNumpy()
                    sec_swell_dir = mr.Variables(5).ValuesAsNumpy()
                    surf_height_max_m = mr.Variables(6).ValuesAsNumpy()
                    water_temp_c = mr.Variables(7).ValuesAsNumpy()
                    tide_level_m = mr.Variables(8).ValuesAsNumpy()

                    # Build records with IMPERIAL UNIT CONVERSIONS
                    n = min(len(timestamps), len(wind_speed_kph), len(surf_height_max_m))
                    for j in range(n):
                        # Convert wave heights to feet
                        raw_surf_max_m = surf_height_max_m[j]
                        surf_max_ft = safe_float(meters_to_feet(raw_surf_max_m))
                        surf_min_ft = surf_max_ft * 0.7 if surf_max_ft is not None else None
                        
                        # Wave energy in foot-pounds (using feet instead of meters)
                        wave_energy_ft_lbs = surf_max_ft ** 2 if surf_max_ft is not None else None

                        record = {
                            "beach_id": beach_id,
                            "timestamp": pd.Timestamp(timestamps[j]).isoformat(),
                            
                            # Swell data - convert heights to feet, keep periods in seconds, directions in degrees
                            "primary_swell_height_ft": safe_float(meters_to_feet(pri_swell_h_m[j])),
                            "primary_swell_period_s": safe_float(pri_swell_p[j]),
                            "primary_swell_direction": safe_float(pri_swell_dir[j]),
                            
                            "secondary_swell_height_ft": safe_float(meters_to_feet(sec_swell_h_m[j])),
                            "secondary_swell_period_s": safe_float(sec_swell_p[j]),
                            "secondary_swell_direction": safe_float(sec_swell_dir[j]),
                            
                            # Surf data - all in feet
                            "surf_height_min_ft": safe_float(surf_min_ft),
                            "surf_height_max_ft": safe_float(surf_max_ft),
                            "wave_energy_ft_lbs": safe_float(wave_energy_ft_lbs),
                            
                            # Water conditions - temperature in F, tide in feet
                            "water_temp_f": safe_float(celsius_to_fahrenheit(water_temp_c[j])),
                            "tide_level_ft": safe_float(meters_to_feet(tide_level_m[j])),
                            
                            # Wind data - convert to mph
                            "wind_speed_mph": safe_float(kph_to_mph(wind_speed_kph[j])),
                            "wind_gust_mph": safe_float(kph_to_mph(wind_gust_kph[j])),
                            "wind_direction_deg": safe_float(wind_dir_deg[j]),
                            
                            # Weather data - temperature in F, pressure in inHg
                            "temperature": safe_float(celsius_to_fahrenheit(temp_2m_c[j])),
                            "weather": safe_int(weather_code[j]),  # Weather code as integer
                            "pressure_inhg": safe_float(hpa_to_inhg(pressure_hpa[j])),
                        }

                        if nonempty_record(record):
                            rows.append(record)

                    processed_beaches += 1
                    
                except Exception as e:
                    logger.error(f"ERROR: Error processing {name}: {e}")

            # Bulk upsert (insert or update on conflict)
            if rows:
                for chunk in chunk_iter(rows, UPSERT_CHUNK):
                    try:
                        # Use upsert to handle duplicates gracefully
                        supabase.table("forecast_data").upsert(
                            chunk, 
                            on_conflict="beach_id,timestamp"
                        ).execute()
                        total_inserted += len(chunk)
                    except Exception as e:
                        logger.error(f"ERROR: Error upserting forecast chunk: {e}")

            batch_time = time.time() - batch_start
            logger.info(f"   OK: Batch {batch_count}/{total_batches} completed: {len(batch)} beaches, {len(rows)} records in {batch_time:.1f}s")
            
            # Progress update
            if batch_count % 5 == 0 or batch_count == total_batches:
                progress = (batch_count / total_batches) * 100
                logger.info(f"   PROGRESS: {batch_count}/{total_batches} batches ({progress:.1f}%) - {processed_beaches} beaches processed")

        except Exception as e:
            logger.error(f"ERROR: Error processing batch {batch_count}: {e}")
            # Add extra delay after error before continuing
            if 'rate limit' in str(e).lower():
                logger.info(f"   Waiting extra {RETRY_DELAY}s after rate limit error...")
                time.sleep(RETRY_DELAY)

    log_step(f"Forecast update completed: {processed_beaches} beaches, {total_inserted} records")
    return total_inserted

def fetch_vc_daily_for_county(county_info, today_utc, end_date_utc):
    """Fetch 7-day daily data for a county from Visual Crossing with retry logic."""
    county = county_info["county"]
    lat = county_info["latitude"]
    lon = county_info["longitude"]

    url = (
        f"https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/"
        f"{lat},{lon}/{today_utc}/{end_date_utc}"
        f"?unitGroup=us&key={VC_API_KEY}&contentType=json"
    )

    for attempt in range(MAX_RETRIES + 1):
        try:
            # Add small delay for Visual Crossing API
            if attempt > 0:
                time.sleep(API_DELAY * attempt)
            
            with urllib.request.urlopen(url, timeout=30) as resp:
                data = json.load(resp)
            break  # Success, exit retry loop
            
        except urllib.error.HTTPError as e:
            if e.code == 429:  # Rate limited
                if attempt < MAX_RETRIES:
                    wait_time = RETRY_DELAY * (attempt + 1)
                    logger.warning(f"   Rate limited for {county} (attempt {attempt + 1}), waiting {wait_time}s...")
                    time.sleep(wait_time)
                    continue
                else:
                    logger.error(f"ERROR: Rate limit exceeded for {county} after {MAX_RETRIES + 1} attempts")
                    return []
            else:
                logger.error(f"ERROR: HTTP error for {county}: {e.code}")
                return []
        except Exception as e:
            logger.error(f"ERROR: Error fetching daily data for {county}: {e}")
            if attempt < MAX_RETRIES:
                time.sleep(API_DELAY * (attempt + 1))
                continue
            return []

    rows = []
    for day in data.get("days", []):
        date_str = day.get("datetime")
        moonphase = day.get("moonphase")
        sunrise = day.get("sunrise", "")
        sunset = day.get("sunset", "")

        sunrise_hm = sunrise[-8:-3] if isinstance(sunrise, str) and len(sunrise) >= 8 else None
        sunset_hm = sunset[-8:-3] if isinstance(sunset, str) and len(sunset) >= 8 else None

        rows.append({
            "county": county,
            "date": date_str,
            "moon_phase": moonphase,
            "sunrise": sunrise_hm,
            "sunset": sunset_hm,
        })
    
    return rows

def update_daily_conditions(counties):
    """Update daily county conditions."""
    log_step("Updating daily conditions", 5)
    
    today_utc = datetime.now(timezone.utc).date()
    end_date_utc = today_utc + timedelta(days=DAYS_FORECAST - 1)
    
    all_rows = []
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        futures = {
            pool.submit(fetch_vc_daily_for_county, c, today_utc, end_date_utc): c["county"]
            for c in counties
        }
        for fut in as_completed(futures):
            county = futures[fut]
            try:
                rows = fut.result() or []
                all_rows.extend(rows)
                if rows:
                    logger.info(f"   OK {county}: {len(rows)} days")
            except Exception as e:
                logger.error(f"ERROR: Error for county {county}: {e}")

    # Bulk upsert (insert or update on conflict)
    inserted_total = 0
    if all_rows:
        for chunk in chunk_iter(all_rows, UPSERT_CHUNK):
            try:
                # Use upsert to handle duplicates gracefully
                supabase.table("daily_county_conditions").upsert(
                    chunk,
                    on_conflict="county,date"
                ).execute()
                inserted_total += len(chunk)
            except Exception as e:
                logger.error(f"ERROR: Error upserting daily conditions chunk: {e}")

    log_step(f"Daily conditions updated: {len(counties)} counties, {inserted_total} records")
    return inserted_total

# === MAIN EXECUTION ===
def main():
    """Main execution function."""
    start_time = time.time()
    logger.info("SURF: Starting surf database update with IMPERIAL UNITS...")
    
    try:
        # Step 1: Cleanup old data
        if not cleanup_old_data():
            logger.warning("Cleanup had issues, but continuing...")
        
        # Step 2: Fetch beaches and counties
        beaches = fetch_all_beaches()
        if not beaches:
            logger.error("ERROR: No beaches found, aborting")
            return False
            
        counties = fetch_all_counties()
        if not counties:
            logger.error("ERROR: No counties found, aborting")
            return False
        
        # Step 3: Update forecast data
        forecast_count = update_forecast_data(beaches)
        
        # Step 4: Update daily conditions
        daily_count = update_daily_conditions(counties)
        
        # Summary
        total_time = time.time() - start_time
        log_step("DATABASE UPDATE COMPLETED! SUCCESS!")
        logger.info(f"STATS: Summary:")
        logger.info(f"   • Beaches processed: {len(beaches)}")
        logger.info(f"   • Counties processed: {len(counties)}")
        logger.info(f"   • Forecast records: {forecast_count}")
        logger.info(f"   • Daily condition records: {daily_count}")
        logger.info(f"   • Total time: {total_time:.1f} seconds")
        logger.info(f"   • Units: Imperial (mph, feet, Fahrenheit, inHg)")
        
        return True
        
    except Exception as e:
        logger.error(f"ERROR: CRITICAL ERROR: {e}")
        return False

if __name__ == "__main__":
    success = main()
    exit_code = 0 if success else 1
    logger.info(f"DONE: Script finished with exit code: {exit_code}")
    sys.exit(exit_code)