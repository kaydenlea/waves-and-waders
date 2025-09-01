#!/usr/bin/env python3
"""
Configuration file for Hybrid Surf Database Update Script
Contains all constants, API keys, and global settings
"""

import os
import sys
import logging
import threading

# Fix for Windows console encoding
if sys.platform == "win32":
    os.environ["PYTHONIOENCODING"] = "utf-8"

# === API CREDENTIALS ===
SUPABASE_URL = "https://wborkytqlmkcgwzhsoiz.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indib3JreXRxbG1rY2d3emhzb2l6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxMTMxNDcsImV4cCI6MjA2OTY4OTE0N30.9kRB3eSEL_N37dy6FjGfNJEDBiCXam9nepDLowCCxk0"
VC_API_KEY = "NFYFM562X2PY2M4W4GE8WZZGC"

# === NOAA CONFIGURATION ===
NOAA_BASE_URL = "http://nomads.ncep.noaa.gov:80/dods/wave/gfswave"
NOAA_BASE_URL_HTTPS = "https://nomads.ncep.noaa.gov/dods/wave/gfswave"

# NOAA Variable Mapping
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

# === SCRIPT SETTINGS ===
DAYS_FORECAST = 7
BATCH_SIZE = 10           
UPSERT_CHUNK = 3000
MAX_WORKERS = 3           
LOG_LEVEL = logging.INFO
API_DELAY = 2.0           
RETRY_DELAY = 65          
MAX_RETRIES = 3           

# === RATE LIMITING SETTINGS ===

# NOAA OpenDAP rate limiting - OPTIMIZED for 50 hits/minute target
NOAA_REQUEST_DELAY = .2        # 1.5 seconds = 40 requests/minute (under 50/min target)
NOAA_BATCH_DELAY = 1.5          # 3 seconds between location groups (reduced from 10s)
NOAA_MAX_CONCURRENT = 1         # Only 1 concurrent NOAA request at a time
NOAA_RETRY_DELAY = 600          # 10 minutes if rate limited by NOAA
NOAA_DATASET_TEST_DELAY = 1.0   # 2 seconds between dataset URL tests (reduced from 5s)

# Open-Meteo rate limiting - CONSERVATIVE for good API citizenship
OPENMETEO_REQUEST_DELAY = 1.0   # 1 second between Open-Meteo API calls
OPENMETEO_BATCH_DELAY = 2.0     # 2 seconds between batches
OPENMETEO_RETRY_DELAY = 60      # 1 minute wait if rate limited
OPENMETEO_MAX_RETRIES = 3       # Maximum retry attempts

# === PHYSICAL CONSTANTS ===
TIDE_ADJUSTMENT_FT = 2.4  # Tide adjustment constant (in feet)

# NOAA grid search parameters - REDUCED to minimize requests
LAT_OFFSETS = [-0.05, 0, 0.05]         # Reduced from 5 to 3 offsets  
LON_OFFSETS = [-0.1, 0, 0.1]           # Reduced from 5 to 3 offsets

# === RATE LIMITING GLOBALS ===
_noaa_last_request_time = 0
_noaa_request_lock = threading.Lock()

# === GLOBAL VARIABLE ACCESS FUNCTIONS ===
def get_noaa_rate_limit_globals():
    """Return references to the global rate limiting variables."""
    global _noaa_last_request_time, _noaa_request_lock
    return _noaa_last_request_time, _noaa_request_lock

def set_noaa_last_request_time(timestamp):
    """Set the global NOAA last request time."""
    global _noaa_last_request_time
    _noaa_last_request_time = timestamp

# === LOGGING SETUP ===
def setup_logging():
    """Configure logging for the application."""
    logging.basicConfig(
        level=LOG_LEVEL,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler('surf_update_hybrid.log', encoding='utf-8'),
            logging.StreamHandler(sys.stdout)
        ]
    )
    return logging.getLogger("surf_update")  # Use consistent name across modules

# Initialize logger
logger = setup_logging()

# === CONFIGURATION VALIDATION ===
def validate_configuration():
    """Validate that all required configuration is present."""
    required_keys = ["SUPABASE_URL", "SUPABASE_KEY", "VC_API_KEY"]
    missing = []
    
    for key in required_keys:
        if not globals().get(key):
            missing.append(key)
    
    if missing:
        raise ValueError(f"Missing required configuration: {missing}")
    
    logger.info("Configuration validation passed")
    return True

# === BASE URLS FOR DIFFERENT SERVICES ===
NOAA_BASE_URLS = [
    "http://nomads.ncep.noaa.gov:80/dods/wave/gfswave",  # Original with port
    "http://nomads.ncep.noaa.gov/dods/wave/gfswave",     # Without port
    "https://nomads.ncep.noaa.gov/dods/wave/gfswave",    # HTTPS
]

# === API ENDPOINTS ===
OPENMETEO_WEATHER_URL = "https://api.open-meteo.com/v1/forecast"
OPENMETEO_MARINE_URL = "https://marine-api.open-meteo.com/v1/marine"
VISUAL_CROSSING_BASE = "https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline"