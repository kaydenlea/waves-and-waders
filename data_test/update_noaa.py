#!/usr/bin/env python3
"""
Hybrid Surf Database Update Script - IMPERIAL UNITS VERSION
Combines NOAA GFSwave data with Open-Meteo data for comprehensive forecasting.
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
import xarray as xr
from supabase import create_client, Client

# === CONFIGURATION ===
SUPABASE_URL = "https://wborkytqlmkcgwzhsoiz.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indib3JreXRxbG1rY2d3emhzb2l6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxMTMxNDcsImV4cCI6MjA2OTY4OTE0N30.9kRB3eSEL_N37dy6FjGfNJEDBiCXam9nepDLowCCxk0"
VC_API_KEY = "NFYFM562X2PY2M4W4GE8WZZGC"

# NOAA GFSwave Configuration
NOAA_BASE_URL = "http://nomads.ncep.noaa.gov:80/dods/wave/gfswave"
NOAA_BASE_URL_HTTPS = "https://nomads.ncep.noaa.gov/dods/wave/gfswave"  # Alternative HTTPS

# NOAA grid search parameters
LAT_OFFSETS = [-0.1, -0.05, 0, 0.05, 0.1]
LON_OFFSETS = [-0.2, -0.1, 0, 0.1, 0.2]

# Script settings with rate limiting
DAYS_FORECAST = 7
BATCH_SIZE = 10           
UPSERT_CHUNK = 3000
MAX_WORKERS = 3           
LOG_LEVEL = logging.INFO
API_DELAY = 2.0           
RETRY_DELAY = 65          
MAX_RETRIES = 3           

# NOAA OpenDAP rate limiting (be extra gentle)
NOAA_REQUEST_DELAY = 5.0     # 5 second delay between NOAA requests
NOAA_BATCH_DELAY = 15.0      # 15 second delay between grid point batches
NOAA_MAX_CONCURRENT = 1      # Only 1 concurrent NOAA request at a time
NOAA_RETRY_DELAY = 300       # 5 minutes wait if rate limited by NOAA           

# Tide adjustment constant (in feet)
TIDE_ADJUSTMENT_FT = 2.4

# NOAA grid search parameters
LAT_OFFSETS = [-0.1, -0.05, 0, 0.05, 0.1]
LON_OFFSETS = [-0.2, -0.1, 0, 0.1, 0.2]

# Fix for Windows console encoding
if sys.platform == "win32":
    os.environ["PYTHONIOENCODING"] = "utf-8"

# === LOGGING SETUP ===
logging.basicConfig(
    level=LOG_LEVEL,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('surf_update_hybrid.log', encoding='utf-8'),
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

# === NOAA VARIABLE MAPPING ===
NOAA_VARS = {
    "primary_swell_height": "swell_2",      # 2nd sequence swell (usually dominant)
    "primary_swell_period": "swper_2",      
    "primary_swell_direction": "swdir_2",
    "secondary_swell_height": "swell_3",    # 3rd sequence swell
    "secondary_swell_period": "swper_3",
    "secondary_swell_direction": "swdir_3",
    "tertiary_swell_height": "swell_1",     # 1st sequence swell (tertiary for us)
    "tertiary_swell_period": "swper_1",
    "tertiary_swell_direction": "swdir_1",
    "surf_sig_height": "htsgwsfc",          # Significant wave height
    "wind_speed": "windsfc",                # Wind speed m/s
    "wind_direction": "wdirsfc",            # Wind direction degrees
    "primary_wave_period": "perpwsfc",      # Primary wave period
    "primary_wave_direction": "dirpwsfc",   # Primary wave direction
}

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

def mps_to_mph(mps):
    """Convert m/s to mph."""
    if mps is None:
        return None
    return mps * 2.237

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

def calculate_wave_energy_kj(wave_height_ft, wave_period_s):
    """
    Calculate wave energy in kilojoules matching surf-forecast.com values.
    """
    if wave_height_ft is None or wave_period_s is None:
        return None
    
    try:
        wave_height_m = wave_height_ft / 3.28084
        energy_kj = (wave_height_m ** 2) * wave_period_s * 8.5
        return round(energy_kj)
    except Exception:
        return None

# === UTILITY FUNCTIONS ===
def log_step(message: str, step_num: int = None):
    """Log a major step with formatting."""
    if step_num:
        logger.info(f"STEP {step_num}: {message}")
    else:
        logger.info(f"OK: {message}")

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

def test_noaa_url(url):
    """Test a single NOAA URL and return success/failure with details."""
    try:
        logger.info(f"      Testing: {url}")
        
        # Add delay before NOAA request to respect rate limits
        time.sleep(NOAA_REQUEST_DELAY)
        
        # Check for rate limit HTML response
        try:
            # Try to open dataset with proper OpenDAP backend specification
            ds_test = xr.open_dataset(
                url, 
                engine='netcdf4',  # Explicitly specify netcdf4 engine for OpenDAP
                decode_times=True,
                chunks=None  # Disable dask chunking for OpenDAP
            )
            
            # Verify we can access time variable
            time_var = ds_test.time
            time_len = len(time_var)
            
            # Verify we can access a swell variable
            swell_var = ds_test.swell_2
            swell_shape = swell_var.shape
            
            ds_test.close()
            logger.info(f"      ✅ SUCCESS: {time_len} time steps, swell shape: {swell_shape}")
            return True, f"Working dataset with {time_len} time steps"
            
        except Exception as e:
            error_str = str(e).lower()
            
            # Check if it's a rate limit error
            if 'rate limit' in error_str or 'over rate limit' in error_str or 'limit exceeded' in error_str:
                logger.error(f"      🚫 RATE LIMITED by NOAA! Waiting {NOAA_RETRY_DELAY} seconds...")
                time.sleep(NOAA_RETRY_DELAY)
                return False, "NOAA rate limit exceeded"
            else:
                raise e
        
    except Exception as e:
        error_msg = str(e)
        
        # Check for HTML rate limit response in error message
        if 'over rate limit' in error_msg.lower() or 'doctype html' in error_msg.lower():
            logger.error(f"      🚫 NOAA RATE LIMIT DETECTED! Must wait before retrying.")
            logger.error(f"      💡 Suggestion: Wait 1 hour before running again")
            return False, "NOAA rate limit - HTML response detected"
        
        logger.warning(f"      ❌ FAILED: {error_msg[:200]}")
        return False, error_msg

def get_noaa_dataset_url():
    """Get the current NOAA GFSwave dataset URL with comprehensive testing."""
    logger.info("   🔍 Searching for available NOAA GFSwave dataset...")
    
    today = datetime.now(timezone.utc)
    today_str = today.strftime("%Y%m%d")
    
    # Base URLs to try (HTTP and HTTPS)
    base_urls = [
        "http://nomads.ncep.noaa.gov:80/dods/wave/gfswave",  # Original with port
        "http://nomads.ncep.noaa.gov/dods/wave/gfswave",     # Without port
        "https://nomads.ncep.noaa.gov/dods/wave/gfswave",    # HTTPS
    ]
    
    # Try today first
    logger.info(f"   📅 Trying today's data: {today_str}")
    for base_url in base_urls:
        logger.info(f"   🌐 Base URL: {base_url}")
        for run in ["00z", "06z", "12z", "18z"]:
            # CORRECTED URL FORMAT - includes the full dataset filename
            url = f"{base_url}/{today_str}/gfswave.wcoast.0p16_{run}"
            success, message = test_noaa_url(url)
            if success:
                logger.info(f"   ✅ FOUND: Using {today_str} {run}")
                return url
    
    # Try yesterday
    yesterday = today - timedelta(days=1)
    yesterday_str = yesterday.strftime("%Y%m%d")
    logger.info(f"   📅 Trying yesterday's data: {yesterday_str}")
    
    for base_url in base_urls:
        logger.info(f"   🌐 Base URL: {base_url}")
        for run in ["18z", "12z", "06z", "00z"]:  # Try latest runs first
            # CORRECTED URL FORMAT - includes the full dataset filename
            url = f"{base_url}/{yesterday_str}/gfswave.wcoast.0p16_{run}"
            success, message = test_noaa_url(url)
            if success:
                logger.info(f"   ✅ FOUND: Using {yesterday_str} {run} (yesterday)")
                return url
    
    # Try a few more days back
    logger.info("   📅 Trying additional fallback dates...")
    for days_back in [2, 3, 4]:
        fallback_date = today - timedelta(days=days_back)
        fallback_str = fallback_date.strftime("%Y%m%d")
        logger.info(f"   📅 Trying {days_back} days back: {fallback_str}")
        
        for base_url in base_urls:
            for run in ["18z", "12z", "06z", "00z"]:
                # CORRECTED URL FORMAT - includes the full dataset filename
                url = f"{base_url}/{fallback_str}/gfswave.wcoast.0p16_{run}"
                success, message = test_noaa_url(url)
                if success:
                    logger.info(f"   ✅ FOUND: Using {fallback_str} {run} ({days_back} days back)")
                    return url
    
    # Comprehensive error message
    logger.error("   ❌ EXHAUSTED ALL OPTIONS:")
    logger.error(f"      • Tried dates: {today_str} to {(today - timedelta(days=4)).strftime('%Y%m%d')}")
    logger.error(f"      • Tried base URLs: {len(base_urls)} different protocols")
    logger.error(f"      • Tried runs: 00z, 06z, 12z, 18z")
    logger.error(f"      • Example URL format: http://nomads.ncep.noaa.gov:80/dods/wave/gfswave/{today_str}/gfswave.wcoast.0p16_00z")
    logger.error("      • Possible causes:")
    logger.error("        - Network connectivity issues")
    logger.error("        - NOAA server maintenance")
    logger.error("        - OpenDAP service unavailable")
    logger.error("        - Firewall blocking OpenDAP protocol")
    logger.error("        - Missing netcdf4 library (try: pip install netcdf4)")
    
    raise Exception("No NOAA GFSwave dataset available - exhausted all URL combinations")

def find_nearest_ocean_point(ds, lat0, lon0):
    """Find the nearest valid ocean grid point for a beach location."""
    lon0_360 = lon0 % 360  # Convert longitude to 0-360 format for NOAA data
    
    for dlat in LAT_OFFSETS:
        for dlon in LON_OFFSETS:
            try:
                lat = lat0 + dlat
                lon = (lon0_360 + dlon) % 360
                
                # Test if this point has valid data
                test_var = "swell_2"  # Use swell_2 to test
                val = ds[test_var].isel(time=0).sel(lat=lat, lon=lon, method="nearest").values
                
                if not np.isnan(val):
                    grid_lat = float(ds.lat.sel(lat=lat, method="nearest").values)
                    grid_lon = float(ds.lon.sel(lon=lon, method="nearest").values)
                    return grid_lat, grid_lon
                    
            except Exception:
                continue
    
    return None, None

# === DATABASE OPERATIONS ===
def cleanup_old_data():
    """Delete all existing forecast and daily condition data."""
    log_step("Cleaning up old data", 1)
    
    try:
        yesterday = (datetime.now() - timedelta(days=1)).isoformat()
        
        # Delete forecast data
        logger.info("DELETE: Deleting old forecast data...")
        try:
            forecast_delete = supabase.table("forecast_data").delete().lt('timestamp', yesterday).execute()
            future_delete = supabase.table("forecast_data").delete().gte('timestamp', yesterday).execute()
            logger.info("   Forecast data deleted successfully")
        except Exception as e:
            logger.warning(f"   Forecast deletion failed: {e}, will use UPSERT")
        
        # Delete daily conditions  
        logger.info("DELETE: Deleting old daily conditions...")
        try:
            yesterday_date = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
            daily_delete = supabase.table("daily_county_conditions").delete().lt('date', yesterday_date).execute()
            future_daily_delete = supabase.table("daily_county_conditions").delete().gte('date', yesterday_date).execute()
            logger.info("   Daily conditions deleted successfully")
        except Exception as e:
            logger.warning(f"   Daily conditions deletion failed: {e}, will use UPSERT")
        
        log_step("Old data cleanup completed")
        return True
        
    except Exception as e:
        logger.error(f"ERROR: Error during cleanup: {e}")
        return True  # Continue with UPSERT mode

def fetch_all_beaches(page_size: int = 1000):
    """Fetch all beaches with valid coordinates."""
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
    
    log_step(f"Found {len(valid_beaches)} beaches with valid coordinates")
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

# === NOAA BULK OPTIMIZATION FUNCTIONS ===
    """Delete all existing forecast and daily condition data."""
    log_step("Cleaning up old data", 1)
    
    try:
        yesterday = (datetime.now() - timedelta(days=1)).isoformat()
        
        # Delete forecast data
        logger.info("DELETE: Deleting old forecast data...")
        try:
            forecast_delete = supabase.table("forecast_data").delete().lt('timestamp', yesterday).execute()
            future_delete = supabase.table("forecast_data").delete().gte('timestamp', yesterday).execute()
            logger.info("   Forecast data deleted successfully")
        except Exception as e:
            logger.warning(f"   Forecast deletion failed: {e}, will use UPSERT")
        
        # Delete daily conditions  
        logger.info("DELETE: Deleting old daily conditions...")
        try:
            yesterday_date = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
            daily_delete = supabase.table("daily_county_conditions").delete().lt('date', yesterday_date).execute()
            future_daily_delete = supabase.table("daily_county_conditions").delete().gte('date', yesterday_date).execute()
            logger.info("   Daily conditions deleted successfully")
        except Exception as e:
            logger.warning(f"   Daily conditions deletion failed: {e}, will use UPSERT")
        
        log_step("Old data cleanup completed")
        return True
        
    except Exception as e:
        logger.error(f"ERROR: Error during cleanup: {e}")
        return True  # Continue with UPSERT mode

def fetch_all_beaches(page_size: int = 1000):
    """Fetch all beaches with valid coordinates."""
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
    
    log_step(f"Found {len(valid_beaches)} beaches with valid coordinates")
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

def calculate_surf_size_score(height_ft, period_s, direction_deg=None, beach_lat=None, beach_lon=None):
    """
    Calculate surf size score for dynamic swell ranking.
    Based on wave energy and period, similar to Swellnet's algorithm.
    Higher score = more impactful for surfing.
    """
    if height_ft is None or period_s is None:
        return 0
    
    try:
        # Base energy calculation (height^2 * period)
        # This gives more weight to longer period swells
        energy_score = (height_ft ** 2) * period_s
        
        # Period bonus - longer periods get exponential bonus
        # 8s+ gets bonus, 12s+ gets big bonus
        period_bonus = 1.0
        if period_s >= 8:
            period_bonus = 1.2
        if period_s >= 12:
            period_bonus = 1.5
        if period_s >= 16:
            period_bonus = 2.0
            
        # Size bonus - bigger swells get bonus
        size_bonus = 1.0
        if height_ft >= 2:
            size_bonus = 1.1
        if height_ft >= 4:
            size_bonus = 1.3
        if height_ft >= 6:
            size_bonus = 1.5
            
        # Final surf size score
        surf_score = energy_score * period_bonus * size_bonus
        
        return round(surf_score, 2)
        
    except Exception:
        return 0

def rank_swell_trains(swell_data_list):
    """
    Dynamically rank swell trains by surf impact score.
    Returns sorted list: [primary, secondary, tertiary]
    """
    if not swell_data_list:
        return [None, None, None]
    
    # Calculate scores for each swell
    scored_swells = []
    for swell in swell_data_list:
        if swell and 'height_ft' in swell and 'period_s' in swell:
            score = calculate_surf_size_score(
                swell['height_ft'], 
                swell['period_s'],
                swell.get('direction_deg'),
                swell.get('beach_lat'),
                swell.get('beach_lon')
            )
            scored_swells.append((score, swell))
    
    # Sort by score (highest first)
    scored_swells.sort(key=lambda x: x[0], reverse=True)
    
    # Extract top 3 swells
    primary = scored_swells[0][1] if len(scored_swells) > 0 else None
    secondary = scored_swells[1][1] if len(scored_swells) > 1 else None
    tertiary = scored_swells[2][1] if len(scored_swells) > 2 else None
    
    return [primary, secondary, tertiary]

def get_noaa_data_for_beach(ds, beach):
    """Extract NOAA data for a single beach with dynamic swell ranking."""
    beach_id = beach["id"]
    name = beach["Name"]
    lat0 = beach["LATITUDE"]
    lon0 = beach["LONGITUDE"]
    
    try:
        # Find nearest ocean point
        grid_lat, grid_lon = find_nearest_ocean_point(ds, lat0, lon0)
        
        if grid_lat is None or grid_lon is None:
            logger.warning(f"   No valid ocean point found for {name}")
            return []
        
        # Extract time series
        time_vals = pd.to_datetime(ds.time.values)
        
        # Extract ALL swell data from NOAA (all 3 swell trains)
        swell_1_height = ds["swell_1"].sel(lat=grid_lat, lon=grid_lon).values
        swell_1_period = ds["swper_1"].sel(lat=grid_lat, lon=grid_lon).values
        swell_1_direction = ds["swdir_1"].sel(lat=grid_lat, lon=grid_lon).values
        
        swell_2_height = ds["swell_2"].sel(lat=grid_lat, lon=grid_lon).values
        swell_2_period = ds["swper_2"].sel(lat=grid_lat, lon=grid_lon).values
        swell_2_direction = ds["swdir_2"].sel(lat=grid_lat, lon=grid_lon).values
        
        swell_3_height = ds["swell_3"].sel(lat=grid_lat, lon=grid_lon).values
        swell_3_period = ds["swper_3"].sel(lat=grid_lat, lon=grid_lon).values
        swell_3_direction = ds["swdir_3"].sel(lat=grid_lat, lon=grid_lon).values
        
        # Other NOAA variables
        sig_wave_height = ds["htsgwsfc"].sel(lat=grid_lat, lon=grid_lon).values
        wind_speed_mps = ds["windsfc"].sel(lat=grid_lat, lon=grid_lon).values
        wind_direction_deg = ds["wdirsfc"].sel(lat=grid_lat, lon=grid_lon).values
        
        # Build records with dynamic ranking
        records = []
        for i, timestamp in enumerate(time_vals):
            # Prepare all 3 swell trains for ranking
            swell_trains = [
                {
                    'height_ft': safe_float(meters_to_feet(swell_1_height[i])),
                    'period_s': safe_float(swell_1_period[i]),
                    'direction_deg': safe_float(swell_1_direction[i]),
                    'beach_lat': lat0,
                    'beach_lon': lon0,
                    'source': 'swell_1'
                },
                {
                    'height_ft': safe_float(meters_to_feet(swell_2_height[i])),
                    'period_s': safe_float(swell_2_period[i]),
                    'direction_deg': safe_float(swell_2_direction[i]),
                    'beach_lat': lat0,
                    'beach_lon': lon0,
                    'source': 'swell_2'
                },
                {
                    'height_ft': safe_float(meters_to_feet(swell_3_height[i])),
                    'period_s': safe_float(swell_3_period[i]),
                    'direction_deg': safe_float(swell_3_direction[i]),
                    'beach_lat': lat0,
                    'beach_lon': lon0,
                    'source': 'swell_3'
                }
            ]
            
            # DYNAMICALLY RANK the swell trains for this timestamp
            primary, secondary, tertiary = rank_swell_trains(swell_trains)
            
            # NOAA surf height (convert to feet)
            sig_wave_height_m = safe_float(sig_wave_height[i])
            surf_max_ft = safe_float(meters_to_feet(sig_wave_height_m * 1.86)) if sig_wave_height_m else None
            surf_min_ft = safe_float(meters_to_feet(sig_wave_height_m * 0.5)) if sig_wave_height_m else None
            
            # NOAA wind data (convert to mph)
            wind_speed_mph = safe_float(mps_to_mph(wind_speed_mps[i]))
            wind_direction = safe_float(wind_direction_deg[i])
            
            # Calculate wave energy using PRIMARY (highest ranked) swell
            primary_height = primary['height_ft'] if primary else None
            primary_period = primary['period_s'] if primary else None
            wave_energy_kj = calculate_wave_energy_kj(primary_height, primary_period)
            
            record = {
                "beach_id": beach_id,
                "timestamp": pd.Timestamp(timestamp).isoformat(),
                
                # DYNAMICALLY RANKED swell data (in feet and seconds)
                "primary_swell_height_ft": primary['height_ft'] if primary else None,
                "primary_swell_period_s": primary['period_s'] if primary else None,
                "primary_swell_direction": primary['direction_deg'] if primary else None,
                
                "secondary_swell_height_ft": secondary['height_ft'] if secondary else None,
                "secondary_swell_period_s": secondary['period_s'] if secondary else None,
                "secondary_swell_direction": secondary['direction_deg'] if secondary else None,
                
                "tertiary_swell_height_ft": tertiary['height_ft'] if tertiary else None,
                "tertiary_swell_period_s": tertiary['period_s'] if tertiary else None,
                "tertiary_swell_direction": tertiary['direction_deg'] if tertiary else None,
                
                # NOAA surf data (in feet)
                "surf_height_min_ft": surf_min_ft,
                "surf_height_max_ft": surf_max_ft,
                "wave_energy_kj": wave_energy_kj,
                
                # NOAA wind data (in mph)
                "wind_speed_mph": wind_speed_mph,
                "wind_direction_deg": wind_direction,
                
                # These will be filled by Open-Meteo later
                "wind_gust_mph": None,
                "water_temp_f": None,
                "tide_level_ft": None,
                "temperature": None,
                "weather": None,
                "pressure_inhg": None,
            }
            
            if nonempty_record(record):
                records.append(record)
        
        logger.info(f"   NOAA: {name} - {len(records)} records with dynamic swell ranking from grid point ({grid_lat:.2f}, {grid_lon:.2f})")
        return records
        
    except Exception as e:
        logger.error(f"ERROR: NOAA processing failed for {name}: {e}")
        return []

def get_openmeteo_supplement_data(beaches, existing_records):
    """Get supplementary data from Open-Meteo for variables not in NOAA."""
    logger.info("   Fetching Open-Meteo supplement data...")
    
    # Date range
    tz = pytz.timezone("America/Los_Angeles")
    today = datetime.now(tz).strftime("%Y-%m-%d")
    end = (datetime.now(tz) + timedelta(days=DAYS_FORECAST)).strftime("%Y-%m-%d")
    
    try:
        lats = [b["LATITUDE"] for b in beaches]
        lons = [b["LONGITUDE"] for b in beaches]
        ids = [b["id"] for b in beaches]
        
        # Weather API call for temperature, pressure, weather code, and wind gusts
        weather_url = "https://api.open-meteo.com/v1/forecast"
        weather_params = {
            "latitude": lats,
            "longitude": lons,
            "hourly": [
                "windgusts_10m", "temperature_2m", "pressure_msl", "weather_code"
            ],
            "timezone": "America/Los_Angeles",
            "start_date": today,
            "end_date": end
        }
        
        weather_responses = openmeteo.weather_api(weather_url, params=weather_params)
        
        # Marine API call for water temperature and tides
        marine_url = "https://marine-api.open-meteo.com/v1/marine"
        marine_params = {
            "latitude": lats,
            "longitude": lons,
            "hourly": [
                "sea_surface_temperature", "sea_level_height_msl"
            ],
            "timezone": "America/Los_Angeles",
            "start_date": today,
            "end_date": end
        }
        
        marine_responses = openmeteo.weather_api(marine_url, params=marine_params)
        
        # Create a mapping of beach_id + timestamp to supplementary data
        supplement_data = {}
        
        for i, beach_id in enumerate(ids):
            try:
                wr = weather_responses[i].Hourly()
                mr = marine_responses[i].Hourly()
                
                # Create timestamps
                timestamps = pd.to_datetime(
                    range(wr.Time(), wr.TimeEnd(), wr.Interval()), 
                    unit="s", 
                    utc=True
                ).tz_convert("America/Los_Angeles")
                
                # Extract arrays
                wind_gust_kph = wr.Variables(0).ValuesAsNumpy()
                temp_2m_c = wr.Variables(1).ValuesAsNumpy()
                pressure_hpa = wr.Variables(2).ValuesAsNumpy()
                weather_code = wr.Variables(3).ValuesAsNumpy()
                
                water_temp_c = mr.Variables(0).ValuesAsNumpy()
                tide_level_m = mr.Variables(1).ValuesAsNumpy()
                
                # Map to timestamp keys
                for j, timestamp in enumerate(timestamps):
                    key = f"{beach_id}_{pd.Timestamp(timestamp).isoformat()}"
                    
                    # Apply tide adjustment (+2.4 feet)
                    raw_tide_ft = safe_float(meters_to_feet(tide_level_m[j]))
                    adjusted_tide_ft = (raw_tide_ft + TIDE_ADJUSTMENT_FT) if raw_tide_ft is not None else None
                    
                    supplement_data[key] = {
                        "wind_gust_mph": safe_float(kph_to_mph(wind_gust_kph[j])),
                        "water_temp_f": safe_float(celsius_to_fahrenheit(water_temp_c[j])),
                        "tide_level_ft": adjusted_tide_ft,
                        "temperature": safe_float(celsius_to_fahrenheit(temp_2m_c[j])),
                        "weather": safe_int(weather_code[j]),
                        "pressure_inhg": safe_float(hpa_to_inhg(pressure_hpa[j])),
                    }
                    
            except Exception as e:
                logger.error(f"ERROR: Open-Meteo supplement processing failed for beach {beach_id}: {e}")
        
        # Merge supplement data into existing records
        updated_records = []
        for record in existing_records:
            key = f"{record['beach_id']}_{record['timestamp']}"
            if key in supplement_data:
                record.update(supplement_data[key])
            updated_records.append(record)
        
        logger.info(f"   Open-Meteo supplement: Enhanced {len(updated_records)} records")
        return updated_records
        
    except Exception as e:
        logger.error(f"ERROR: Open-Meteo supplement failed: {e}")
        return existing_records

# === NOAA BULK OPTIMIZATION FUNCTIONS ===
def get_noaa_data_bulk_optimized(ds, beaches):
    """Extract NOAA data for all beaches efficiently with bulk loading and caching."""
    logger.info("   🚀 OPTIMIZED: Bulk extracting NOAA data for all beaches...")
    
    # Step 1: Find unique grid points for all beaches (avoid duplicate processing)
    unique_grids = {}
    beach_to_grid = {}
    
    logger.info("   📍 Finding optimal grid points for all beaches...")
    for beach in beaches:
        beach_id = beach["id"]
        name = beach["Name"]
        lat0 = beach["LATITUDE"]
        lon0 = beach["LONGITUDE"]
        
        # Find nearest ocean point
        grid_lat, grid_lon = find_nearest_ocean_point(ds, lat0, lon0)
        
        if grid_lat is not None and grid_lon is not None:
            # Round to avoid tiny differences
            grid_key = f"{grid_lat:.2f},{grid_lon:.2f}"
            
            if grid_key not in unique_grids:
                unique_grids[grid_key] = {
                    'lat': grid_lat, 
                    'lon': grid_lon, 
                    'beaches': []
                }
            
            unique_grids[grid_key]['beaches'].append(beach)
            beach_to_grid[beach_id] = grid_key
        else:
            logger.warning(f"   ⚠️  No valid ocean point found for {name}")
            beach_to_grid[beach_id] = None
    
    logger.info(f"   📊 Found {len(unique_grids)} unique grid points for {len(beaches)} beaches")
    
    # Step 2: Bulk extract data for each unique grid point
    grid_data_cache = {}
    time_vals = pd.to_datetime(ds.time.values)
    
    logger.info("   💾 Bulk loading NOAA data by grid points...")
    for grid_key, grid_info in unique_grids.items():
        grid_lat = grid_info['lat']
        grid_lon = grid_info['lon']
        beach_count = len(grid_info['beaches'])
        
        logger.info(f"   📥 Loading grid {grid_key} (serves {beach_count} beaches)...")
        
        try:
            # BULK EXTRACT all variables for this grid point at once
            grid_data = {
                'time_vals': time_vals,
                'swell_1_height': ds["swell_1"].sel(lat=grid_lat, lon=grid_lon).values,
                'swell_1_period': ds["swper_1"].sel(lat=grid_lat, lon=grid_lon).values,
                'swell_1_direction': ds["swdir_1"].sel(lat=grid_lat, lon=grid_lon).values,
                'swell_2_height': ds["swell_2"].sel(lat=grid_lat, lon=grid_lon).values,
                'swell_2_period': ds["swper_2"].sel(lat=grid_lat, lon=grid_lon).values,
                'swell_2_direction': ds["swdir_2"].sel(lat=grid_lat, lon=grid_lon).values,
                'swell_3_height': ds["swell_3"].sel(lat=grid_lat, lon=grid_lon).values,
                'swell_3_period': ds["swper_3"].sel(lat=grid_lat, lon=grid_lon).values,
                'swell_3_direction': ds["swdir_3"].sel(lat=grid_lat, lon=grid_lon).values,
                'sig_wave_height': ds["htsgwsfc"].sel(lat=grid_lat, lon=grid_lon).values,
                'wind_speed_mps': ds["windsfc"].sel(lat=grid_lat, lon=grid_lon).values,
                'wind_direction_deg': ds["wdirsfc"].sel(lat=grid_lat, lon=grid_lon).values,
            }
            
            grid_data_cache[grid_key] = grid_data
            logger.info(f"   ✅ Grid {grid_key} loaded successfully")
            
        except Exception as e:
            logger.error(f"   ❌ Failed to load grid {grid_key}: {e}")
            grid_data_cache[grid_key] = None
    
    # Step 3: Process all beaches using cached grid data
    logger.info("   🏖️  Processing all beaches using cached grid data...")
    all_records = []
    
    for beach in beaches:
        beach_id = beach["id"]
        name = beach["Name"]
        lat0 = beach["LATITUDE"]
        lon0 = beach["LONGITUDE"]
        
        grid_key = beach_to_grid.get(beach_id)
        if not grid_key or grid_key not in grid_data_cache:
            continue
            
        grid_data = grid_data_cache[grid_key]
        if grid_data is None:
            continue
        
        try:
            # Process this beach using the cached grid data
            beach_records = process_beach_with_cached_data(
                beach, grid_data, grid_key
            )
            all_records.extend(beach_records)
            
        except Exception as e:
            logger.error(f"   ❌ Error processing {name} with cached data: {e}")
    
    logger.info(f"   🎯 OPTIMIZED: Processed {len(beaches)} beaches → {len(all_records)} records")
    return all_records

def process_beach_with_cached_data(beach, grid_data, grid_key):
    """Process a single beach using pre-loaded grid data."""
    beach_id = beach["id"]
    name = beach["Name"]
    lat0 = beach["LATITUDE"]
    lon0 = beach["LONGITUDE"]
    
    records = []
    time_vals = grid_data['time_vals']
    
    # Process each timestamp using cached data
    for i, timestamp in enumerate(time_vals):
        # Prepare all 3 swell trains for ranking using cached data
        swell_trains = [
            {
                'height_ft': safe_float(meters_to_feet(grid_data['swell_1_height'][i])),
                'period_s': safe_float(grid_data['swell_1_period'][i]),
                'direction_deg': safe_float(grid_data['swell_1_direction'][i]),
                'beach_lat': lat0,
                'beach_lon': lon0,
                'source': 'swell_1'
            },
            {
                'height_ft': safe_float(meters_to_feet(grid_data['swell_2_height'][i])),
                'period_s': safe_float(grid_data['swell_2_period'][i]),
                'direction_deg': safe_float(grid_data['swell_2_direction'][i]),
                'beach_lat': lat0,
                'beach_lon': lon0,
                'source': 'swell_2'
            },
            {
                'height_ft': safe_float(meters_to_feet(grid_data['swell_3_height'][i])),
                'period_s': safe_float(grid_data['swell_3_period'][i]),
                'direction_deg': safe_float(grid_data['swell_3_direction'][i]),
                'beach_lat': lat0,
                'beach_lon': lon0,
                'source': 'swell_3'
            }
        ]
        
        # DYNAMICALLY RANK the swell trains for this timestamp
        primary, secondary, tertiary = rank_swell_trains(swell_trains)
        
        # NOAA surf height (convert to feet)
        sig_wave_height_m = safe_float(grid_data['sig_wave_height'][i])
        surf_max_ft = safe_float(meters_to_feet(sig_wave_height_m * 1.86)) if sig_wave_height_m else None
        surf_min_ft = safe_float(meters_to_feet(sig_wave_height_m * 0.5)) if sig_wave_height_m else None
        
        # NOAA wind data (convert to mph)
        wind_speed_mph = safe_float(mps_to_mph(grid_data['wind_speed_mps'][i]))
        wind_direction = safe_float(grid_data['wind_direction_deg'][i])
        
        # Calculate wave energy using PRIMARY (highest ranked) swell
        primary_height = primary['height_ft'] if primary else None
        primary_period = primary['period_s'] if primary else None
        wave_energy_kj = calculate_wave_energy_kj(primary_height, primary_period)
        
        record = {
            "beach_id": beach_id,
            "timestamp": pd.Timestamp(timestamp).isoformat(),
            
            # DYNAMICALLY RANKED swell data (in feet and seconds)
            "primary_swell_height_ft": primary['height_ft'] if primary else None,
            "primary_swell_period_s": primary['period_s'] if primary else None,
            "primary_swell_direction": primary['direction_deg'] if primary else None,
            
            "secondary_swell_height_ft": secondary['height_ft'] if secondary else None,
            "secondary_swell_period_s": secondary['period_s'] if secondary else None,
            "secondary_swell_direction": secondary['direction_deg'] if secondary else None,
            
            "tertiary_swell_height_ft": tertiary['height_ft'] if tertiary else None,
            "tertiary_swell_period_s": tertiary['period_s'] if tertiary else None,
            "tertiary_swell_direction": tertiary['direction_deg'] if tertiary else None,
            
            # NOAA surf data (in feet)
            "surf_height_min_ft": surf_min_ft,
            "surf_height_max_ft": surf_max_ft,
            "wave_energy_kj": wave_energy_kj,
            
            # NOAA wind data (in mph)
            "wind_speed_mph": wind_speed_mph,
            "wind_direction_deg": wind_direction,
            
            # These will be filled by Open-Meteo later
            "wind_gust_mph": None,
            "water_temp_f": None,
            "tide_level_ft": None,
            "temperature": None,
            "weather": None,
            "pressure_inhg": None,
        }
        
        if nonempty_record(record):
            records.append(record)
    
    return records

# === MAIN FORECAST UPDATE FUNCTIONS ===
def update_forecast_data_hybrid(beaches):
    """Update forecast data using hybrid NOAA + Open-Meteo approach with BULK OPTIMIZATION."""
    
    try:
        # Load NOAA dataset
        logger.info("   Loading NOAA GFSwave dataset...")
        noaa_url = get_noaa_dataset_url()
        
        # Load dataset with proper OpenDAP settings
        ds = xr.open_dataset(
            noaa_url,
            engine='netcdf4',  # Explicitly use netcdf4 for OpenDAP
            decode_times=True,
            chunks=None  # Disable dask chunking for OpenDAP
        )
        logger.info(f"   NOAA dataset loaded: {len(ds.time)} time steps")
        logger.info(f"   Available variables: {list(ds.data_vars.keys())}")
        
        # 🚀 OPTIMIZED: Process all beaches at once with bulk loading
        all_noaa_records = get_noaa_data_bulk_optimized(ds, beaches)
        
        # Close NOAA dataset
        ds.close()
        
        logger.info(f"   Total NOAA records extracted: {len(all_noaa_records)}")
        
        # Get Open-Meteo supplement data for the same beaches
        logger.info("   Enhancing with Open-Meteo supplement data...")
        enhanced_records = get_openmeteo_supplement_data(beaches, all_noaa_records)
        
        # Bulk upsert records
        logger.info("   Uploading enhanced records to database...")
        total_inserted = 0
        if enhanced_records:
            for chunk in chunk_iter(enhanced_records, UPSERT_CHUNK):
                try:
                    supabase.table("forecast_data").upsert(
                        chunk, 
                        on_conflict="beach_id,timestamp"
                    ).execute()
                    total_inserted += len(chunk)
                except Exception as e:
                    logger.error(f"ERROR: Error upserting hybrid forecast chunk: {e}")
        
        log_step(f"Hybrid forecast update completed: {len(beaches)} beaches, {total_inserted} records")
        return total_inserted
        
    except Exception as e:
        logger.error(f"ERROR: Hybrid forecast update failed: {e}")
        logger.error(f"      Full error details: {str(e)}")
        # Fallback to pure Open-Meteo if NOAA fails
        logger.info("   Falling back to pure Open-Meteo data...")
        return update_forecast_data_fallback(beaches)

def process_beach_with_cached_data(beach, grid_data, grid_key):
    """Process a single beach using pre-loaded grid data."""
    beach_id = beach["id"]
    name = beach["Name"]
    lat0 = beach["LATITUDE"]
    lon0 = beach["LONGITUDE"]
    
    records = []
    time_vals = grid_data['time_vals']
    
    # Process each timestamp using cached data
    for i, timestamp in enumerate(time_vals):
        # Prepare all 3 swell trains for ranking using cached data
        swell_trains = [
            {
                'height_ft': safe_float(meters_to_feet(grid_data['swell_1_height'][i])),
                'period_s': safe_float(grid_data['swell_1_period'][i]),
                'direction_deg': safe_float(grid_data['swell_1_direction'][i]),
                'beach_lat': lat0,
                'beach_lon': lon0,
                'source': 'swell_1'
            },
            {
                'height_ft': safe_float(meters_to_feet(grid_data['swell_2_height'][i])),
                'period_s': safe_float(grid_data['swell_2_period'][i]),
                'direction_deg': safe_float(grid_data['swell_2_direction'][i]),
                'beach_lat': lat0,
                'beach_lon': lon0,
                'source': 'swell_2'
            },
            {
                'height_ft': safe_float(meters_to_feet(grid_data['swell_3_height'][i])),
                'period_s': safe_float(grid_data['swell_3_period'][i]),
                'direction_deg': safe_float(grid_data['swell_3_direction'][i]),
                'beach_lat': lat0,
                'beach_lon': lon0,
                'source': 'swell_3'
            }
        ]
        
        # DYNAMICALLY RANK the swell trains for this timestamp
        primary, secondary, tertiary = rank_swell_trains(swell_trains)
        
        # NOAA surf height (convert to feet)
        sig_wave_height_m = safe_float(grid_data['sig_wave_height'][i])
        surf_max_ft = safe_float(meters_to_feet(sig_wave_height_m * 1.86)) if sig_wave_height_m else None
        surf_min_ft = safe_float(meters_to_feet(sig_wave_height_m * 0.5)) if sig_wave_height_m else None
        
        # NOAA wind data (convert to mph)
        wind_speed_mph = safe_float(mps_to_mph(grid_data['wind_speed_mps'][i]))
        wind_direction = safe_float(grid_data['wind_direction_deg'][i])
        
        # Calculate wave energy using PRIMARY (highest ranked) swell
        primary_height = primary['height_ft'] if primary else None
        primary_period = primary['period_s'] if primary else None
        wave_energy_kj = calculate_wave_energy_kj(primary_height, primary_period)
        
        record = {
            "beach_id": beach_id,
            "timestamp": pd.Timestamp(timestamp).isoformat(),
            
            # DYNAMICALLY RANKED swell data (in feet and seconds)
            "primary_swell_height_ft": primary['height_ft'] if primary else None,
            "primary_swell_period_s": primary['period_s'] if primary else None,
            "primary_swell_direction": primary['direction_deg'] if primary else None,
            
            "secondary_swell_height_ft": secondary['height_ft'] if secondary else None,
            "secondary_swell_period_s": secondary['period_s'] if secondary else None,
            "secondary_swell_direction": secondary['direction_deg'] if secondary else None,
            
            "tertiary_swell_height_ft": tertiary['height_ft'] if tertiary else None,
            "tertiary_swell_period_s": tertiary['period_s'] if tertiary else None,
            "tertiary_swell_direction": tertiary['direction_deg'] if tertiary else None,
            
            # NOAA surf data (in feet)
            "surf_height_min_ft": surf_min_ft,
            "surf_height_max_ft": surf_max_ft,
            "wave_energy_kj": wave_energy_kj,
            
            # NOAA wind data (in mph)
            "wind_speed_mph": wind_speed_mph,
            "wind_direction_deg": wind_direction,
            
            # These will be filled by Open-Meteo later
            "wind_gust_mph": None,
            "water_temp_f": None,
            "tide_level_ft": None,
            "temperature": None,
            "weather": None,
            "pressure_inhg": None,
        }
        
        if nonempty_record(record):
            records.append(record)
    
    return records
    """Update forecast data using hybrid NOAA + Open-Meteo approach."""
    log_step("Updating forecast data with hybrid NOAA + Open-Meteo", 4)
    
    try:
        # Load NOAA dataset
        logger.info("   Loading NOAA GFSwave dataset...")
        noaa_url = get_noaa_dataset_url()
        
        # Load dataset with proper OpenDAP settings
        # REMOVED timeout parameter - not supported by netcdf4 backend
        ds = xr.open_dataset(
            noaa_url,
            engine='netcdf4',  # Explicitly use netcdf4 for OpenDAP
            decode_times=True,
            chunks=None  # Disable dask chunking for OpenDAP
        )
        logger.info(f"   NOAA dataset loaded: {len(ds.time)} time steps")
        logger.info(f"   Available variables: {list(ds.data_vars.keys())}")
        
        # Process beaches in batches for NOAA data
        all_noaa_records = []
        total_batches = len(list(chunk_iter(beaches, BATCH_SIZE)))
        batch_count = 0
        
        for batch in chunk_iter(beaches, BATCH_SIZE):
            batch_count += 1
            logger.info(f"   Processing NOAA batch {batch_count}/{total_batches} ({len(batch)} beaches)...")
            
            batch_records = []
            for beach in batch:
                beach_records = get_noaa_data_for_beach(ds, beach)
                batch_records.extend(beach_records)
            
            all_noaa_records.extend(batch_records)
            logger.info(f"   NOAA batch {batch_count}/{total_batches}: {len(batch_records)} records")
        
        # Close NOAA dataset
        ds.close()
        
        logger.info(f"   Total NOAA records extracted: {len(all_noaa_records)}")
        
        # Get Open-Meteo supplement data for the same beaches
        logger.info("   Enhancing with Open-Meteo supplement data...")
        enhanced_records = get_openmeteo_supplement_data(beaches, all_noaa_records)
        
        # Bulk upsert records
        logger.info("   Uploading enhanced records to database...")
        total_inserted = 0
        if enhanced_records:
            for chunk in chunk_iter(enhanced_records, UPSERT_CHUNK):
                try:
                    supabase.table("forecast_data").upsert(
                        chunk, 
                        on_conflict="beach_id,timestamp"
                    ).execute()
                    total_inserted += len(chunk)
                except Exception as e:
                    logger.error(f"ERROR: Error upserting hybrid forecast chunk: {e}")
        
        log_step(f"Hybrid forecast update completed: {len(beaches)} beaches, {total_inserted} records")
        return total_inserted
        
    except Exception as e:
        logger.error(f"ERROR: Hybrid forecast update failed: {e}")
        logger.error(f"      Full error details: {str(e)}")
        # Fallback to pure Open-Meteo if NOAA fails
        logger.info("   Falling back to pure Open-Meteo data...")
        return update_forecast_data_fallback(beaches)

def update_forecast_data_fallback(beaches):
    """Fallback to pure Open-Meteo data if NOAA fails."""
    logger.info("   Using Open-Meteo fallback mode...")
    
    tz = pytz.timezone("America/Los_Angeles")
    today = datetime.now(tz).strftime("%Y-%m-%d")
    end = (datetime.now(tz) + timedelta(days=DAYS_FORECAST)).strftime("%Y-%m-%d")
    
    total_inserted = 0
    batch_count = 0
    total_batches = len(list(chunk_iter(beaches, BATCH_SIZE)))
    
    for batch in chunk_iter(beaches, BATCH_SIZE):
        batch_count += 1
        try:
            ids = [b["id"] for b in batch]
            lats = [b["LATITUDE"] for b in batch]
            lons = [b["LONGITUDE"] for b in batch]
            
            logger.info(f"   Open-Meteo batch {batch_count}/{total_batches} ({len(batch)} beaches)...")
            
            # Weather API call
            weather_url = "https://api.open-meteo.com/v1/forecast"
            weather_params = {
                "latitude": lats,
                "longitude": lons,
                "hourly": [
                    "windspeed_10m", "windgusts_10m", "winddirection_10m",
                    "temperature_2m", "pressure_msl", "weather_code"
                ],
                "timezone": "America/Los_Angeles",
                "start_date": today,
                "end_date": end
            }
            
            weather_responses = openmeteo.weather_api(weather_url, params=weather_params)
            
            # Marine API call
            marine_url = "https://marine-api.open-meteo.com/v1/marine"
            marine_params = {
                "latitude": lats,
                "longitude": lons,
                "hourly": [
                    "swell_wave_height", "swell_wave_period", "swell_wave_direction",
                    "secondary_swell_wave_height", "secondary_swell_wave_period", "secondary_swell_wave_direction",
                    "tertiary_swell_wave_height", "tertiary_swell_wave_period", "tertiary_swell_wave_direction",
                    "wave_height", "sea_surface_temperature", "sea_level_height_msl"
                ],
                "timezone": "America/Los_Angeles",
                "start_date": today,
                "end_date": end
            }
            
            marine_responses = openmeteo.weather_api(marine_url, params=marine_params)
            
            # Process responses
            if len(weather_responses) != len(marine_responses) or len(weather_responses) != len(batch):
                logger.warning(f"WARNING: Response count mismatch for fallback batch {batch_count}, skipping")
                continue
                
            rows = []
            for i in range(len(batch)):
                beach_id = ids[i]
                try:
                    wr = weather_responses[i].Hourly()
                    mr = marine_responses[i].Hourly()
                    
                    timestamps = pd.to_datetime(
                        range(wr.Time(), wr.TimeEnd(), wr.Interval()), 
                        unit="s", 
                        utc=True
                    ).tz_convert("America/Los_Angeles")
                    
                    # Extract weather data
                    wind_speed_kph = wr.Variables(0).ValuesAsNumpy()
                    wind_gust_kph = wr.Variables(1).ValuesAsNumpy()
                    wind_dir_deg = wr.Variables(2).ValuesAsNumpy()
                    temp_2m_c = wr.Variables(3).ValuesAsNumpy()
                    pressure_hpa = wr.Variables(4).ValuesAsNumpy()
                    weather_code = wr.Variables(5).ValuesAsNumpy()
                    
                    # Extract marine data
                    pri_swell_h_m = mr.Variables(0).ValuesAsNumpy()
                    pri_swell_p = mr.Variables(1).ValuesAsNumpy()
                    pri_swell_dir = mr.Variables(2).ValuesAsNumpy()
                    sec_swell_h_m = mr.Variables(3).ValuesAsNumpy()
                    sec_swell_p = mr.Variables(4).ValuesAsNumpy()
                    sec_swell_dir = mr.Variables(5).ValuesAsNumpy()
                    ter_swell_h_m = mr.Variables(6).ValuesAsNumpy()
                    ter_swell_p = mr.Variables(7).ValuesAsNumpy()
                    ter_swell_dir = mr.Variables(8).ValuesAsNumpy()
                    surf_height_max_m = mr.Variables(9).ValuesAsNumpy()
                    water_temp_c = mr.Variables(10).ValuesAsNumpy()
                    tide_level_m = mr.Variables(11).ValuesAsNumpy()
                    
                    # Build records
                    n = min(len(timestamps), len(wind_speed_kph), len(surf_height_max_m))
                    for j in range(n):
                        # Convert to imperial units
                        surf_max_ft = safe_float(meters_to_feet(surf_height_max_m[j]))
                        surf_min_ft = surf_max_ft * 0.7 if surf_max_ft is not None else None
                        
                        pri_swell_height_ft = safe_float(meters_to_feet(pri_swell_h_m[j]))
                        pri_swell_period_s = safe_float(pri_swell_p[j])
                        wave_energy_kj = calculate_wave_energy_kj(pri_swell_height_ft, pri_swell_period_s)
                        
                        raw_tide_ft = safe_float(meters_to_feet(tide_level_m[j]))
                        adjusted_tide_ft = (raw_tide_ft + TIDE_ADJUSTMENT_FT) if raw_tide_ft is not None else None
                        
                        record = {
                            "beach_id": beach_id,
                            "timestamp": pd.Timestamp(timestamps[j]).isoformat(),
                            
                            "primary_swell_height_ft": pri_swell_height_ft,
                            "primary_swell_period_s": pri_swell_period_s,
                            "primary_swell_direction": safe_float(pri_swell_dir[j]),
                            
                            "secondary_swell_height_ft": safe_float(meters_to_feet(sec_swell_h_m[j])),
                            "secondary_swell_period_s": safe_float(sec_swell_p[j]),
                            "secondary_swell_direction": safe_float(sec_swell_dir[j]),
                            
                            "tertiary_swell_height_ft": safe_float(meters_to_feet(ter_swell_h_m[j])),
                            "tertiary_swell_period_s": safe_float(ter_swell_p[j]),
                            "tertiary_swell_direction": safe_float(ter_swell_dir[j]),
                            
                            "surf_height_min_ft": safe_float(surf_min_ft),
                            "surf_height_max_ft": safe_float(surf_max_ft),
                            "wave_energy_kj": wave_energy_kj,
                            
                            "water_temp_f": safe_float(celsius_to_fahrenheit(water_temp_c[j])),
                            "tide_level_ft": adjusted_tide_ft,
                            
                            "wind_speed_mph": safe_float(kph_to_mph(wind_speed_kph[j])),
                            "wind_gust_mph": safe_float(kph_to_mph(wind_gust_kph[j])),
                            "wind_direction_deg": safe_float(wind_dir_deg[j]),
                            
                            "temperature": safe_float(celsius_to_fahrenheit(temp_2m_c[j])),
                            "weather": safe_int(weather_code[j]),
                            "pressure_inhg": safe_float(hpa_to_inhg(pressure_hpa[j])),
                        }
                        
                        if nonempty_record(record):
                            rows.append(record)
                            
                except Exception as e:
                    logger.error(f"ERROR: Fallback processing failed for beach {beach_id}: {e}")
            
            # Upsert batch
            if rows:
                for chunk in chunk_iter(rows, UPSERT_CHUNK):
                    try:
                        supabase.table("forecast_data").upsert(
                            chunk, 
                            on_conflict="beach_id,timestamp"
                        ).execute()
                        total_inserted += len(chunk)
                    except Exception as e:
                        logger.error(f"ERROR: Error upserting fallback chunk: {e}")
            
            logger.info(f"   Fallback batch {batch_count}/{total_batches}: {len(rows)} records")
            
        except Exception as e:
            logger.error(f"ERROR: Fallback batch {batch_count} failed: {e}")
    
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
            if attempt > 0:
                time.sleep(API_DELAY * attempt)
            
            with urllib.request.urlopen(url, timeout=30) as resp:
                data = json.load(resp)
            break
            
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

    # Bulk upsert
    inserted_total = 0
    if all_rows:
        for chunk in chunk_iter(all_rows, UPSERT_CHUNK):
            try:
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
    logger.info("SURF: Starting HYBRID surf database update (NOAA + Open-Meteo)")
    logger.info(f"SURF: Tide adjustment: +{TIDE_ADJUSTMENT_FT} feet")
    logger.info("SURF: Wave energy calculated in kJ (surf-forecast.com style)")
    logger.info("SURF: Primary data from NOAA GFSwave, supplemented with Open-Meteo")
    logger.info("SURF: DYNAMIC SWELL RANKING - Swells ranked by surf impact score")
    
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
        
        # Step 3: Update forecast data with hybrid approach
        log_step("Updating forecast data with hybrid NOAA + Open-Meteo", 4)
        forecast_count = update_forecast_data_hybrid(beaches)
        
        # Step 4: Update daily conditions
        daily_count = update_daily_conditions(counties)
        
        # Summary
        total_time = time.time() - start_time
        log_step("HYBRID DATABASE UPDATE COMPLETED! SUCCESS!")
        logger.info(f"STATS: Summary:")
        logger.info(f"   • Beaches processed: {len(beaches)}")
        logger.info(f"   • Counties processed: {len(counties)}")
        logger.info(f"   • Forecast records: {forecast_count}")
        logger.info(f"   • Daily condition records: {daily_count}")
        logger.info(f"   • Total time: {total_time:.1f} seconds")
        logger.info(f"   • Primary source: NOAA GFSwave")
        logger.info(f"   • Supplement source: Open-Meteo")
        logger.info(f"   • Units: Imperial (mph, feet, Fahrenheit, inHg)")
        logger.info(f"   • Tide adjustment: +{TIDE_ADJUSTMENT_FT} feet applied")
        logger.info(f"   • Wave energy: kJ (surf-forecast.com compatible)")
        logger.info(f"   • Swell ranking: Dynamic by surf impact score")
        
        return True
        
    except Exception as e:
        logger.error(f"ERROR: CRITICAL ERROR: {e}")
        return False

if __name__ == "__main__":
    success = main()
    exit_code = 0 if success else 1
    logger.info(f"DONE: Hybrid script finished with exit code: {exit_code}")
    sys.exit(exit_code)