#!/usr/bin/env python3
"""
Utility functions for Hybrid Surf Database Update Script
Contains unit conversions, rate limiting, and helper functions
"""

import math
import time
import numpy as np
import logging

# Get shared logger
logger = logging.getLogger("surf_update")

from config import (
    NOAA_REQUEST_DELAY, 
    OPENMETEO_REQUEST_DELAY,
    OPENMETEO_RETRY_DELAY,
    OPENMETEO_MAX_RETRIES,
    get_noaa_rate_limit_globals,
    set_noaa_last_request_time
)

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

# === RATE LIMITING FUNCTIONS ===
def enforce_noaa_rate_limit():
    """Enforce NOAA rate limiting with thread safety."""
    last_request_time, request_lock = get_noaa_rate_limit_globals()
    
    with request_lock:
        current_time = time.time()
        time_since_last = current_time - last_request_time
        
        if time_since_last < NOAA_REQUEST_DELAY:
            sleep_time = NOAA_REQUEST_DELAY - time_since_last
            logger.debug(f"      Rate limiting: sleeping {sleep_time:.1f}s")
            time.sleep(sleep_time)
        
        set_noaa_last_request_time(time.time())

def api_request_with_retry(api_func, *args, max_retries=OPENMETEO_MAX_RETRIES, **kwargs):
    """Make Open-Meteo API request with retry logic for rate limiting."""
    for attempt in range(max_retries + 1):
        try:
            # Add delay before each Open-Meteo request
            if attempt > 0:
                logger.info(f"      Retry attempt {attempt}, waiting {OPENMETEO_REQUEST_DELAY}s...")
                time.sleep(OPENMETEO_REQUEST_DELAY)
            
            result = api_func(*args, **kwargs)
            return result
            
        except Exception as e:
            error_str = str(e).lower()
            
            # Check if it's a rate limit error
            if any(phrase in error_str for phrase in ['rate limit', 'limit exceeded', 'try again', 'too many requests', '429']):
                if attempt < max_retries:
                    wait_time = OPENMETEO_RETRY_DELAY * (attempt + 1)  # Exponential backoff
                    logger.warning(f"      Open-Meteo RATE LIMITED (attempt {attempt + 1}/{max_retries + 1}). Waiting {wait_time}s...")
                    time.sleep(wait_time)
                    continue
                else:
                    logger.error(f"ERROR: Open-Meteo rate limit exceeded after {max_retries + 1} attempts")
                    raise e
            else:
                # Not a rate limit error, don't retry
                raise e
    
    raise Exception("Open-Meteo max retries exceeded")

def safe_openmeteo_delay():
    """Add a delay between Open-Meteo API calls to be respectful."""
    time.sleep(OPENMETEO_REQUEST_DELAY)

# === VALIDATION FUNCTIONS ===
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

# === HELPER FUNCTIONS ===
def log_step(message: str, step_num: int = None):
    """Log a major step with formatting."""
    if step_num:
        logger.info(f"STEP {step_num}: {message}")
    else:
        logger.info(f"OK: {message}")

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

# === TIME AND DATE FUNCTIONS ===
def get_current_utc_datestring():
    """Get current UTC date as YYYYMMDD string."""
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).strftime("%Y%m%d")

def get_date_range_strings(days_forecast):
    """Get date range strings for API calls."""
    import pytz
    from datetime import datetime, timedelta
    
    tz = pytz.timezone("America/Los_Angeles")
    today = datetime.now(tz).strftime("%Y-%m-%d")
    end = (datetime.now(tz) + timedelta(days=days_forecast)).strftime("%Y-%m-%d")
    return today, end

# === DATA PROCESSING HELPERS ===
# Note: Swell ranking functions moved to swell_ranking.py module

# === ERROR HANDLING HELPERS ===
def is_rate_limit_error(error_str):
    """Check if error string indicates a rate limit."""
    error_str_lower = str(error_str).lower()
    rate_limit_indicators = [
        'rate limit', 'limit exceeded', 'try again', 
        'too many requests', '429', 'over rate limit'
    ]
    return any(indicator in error_str_lower for indicator in rate_limit_indicators)

def is_noaa_html_rate_limit(error_str):
    """Check if NOAA returned HTML rate limit response."""
    error_str_lower = str(error_str).lower()
    return 'over rate limit' in error_str_lower or 'doctype html' in error_str_lower