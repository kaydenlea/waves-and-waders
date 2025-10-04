@echo off
REM Windows batch file to run the surf database update script

echo 🏄‍♂️ Starting Surf Database Update...
echo.

REM Change to the script directory
cd /d "%~dp0"

REM Run the Python script
echo Running update_surf_database.py...
python update_surf_database.py

REM Check exit code
if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Update completed successfully!
    echo Check surf_update.log for details.
) else (
    echo.
    echo ❌ Update failed with error code: %ERRORLEVEL%
    echo Check surf_update.log for error details.
)

echo.
echo Press any key to close...
pause >nul