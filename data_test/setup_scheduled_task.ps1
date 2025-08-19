# setup_scheduled_task.ps1
# PowerShell script to set up Windows Task Scheduler for automatic database updates

param(
    [string]$ScriptPath = "E:\Code\surf_website\waves-and-waders\data_test",
    [string]$RunTime = "6:00",  # 6 AM daily
    [string]$TaskName = "SurfDatabaseUpdate"
)

Write-Host "🏄‍♂️ Setting up Windows Scheduled Task for Surf Database Updates" -ForegroundColor Cyan
Write-Host ""

# Check if running as administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "❌ This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell and 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

# Verify the script path exists
$ScriptFile = Join-Path $ScriptPath "update_surf_database.py"
if (-not (Test-Path $ScriptFile)) {
    Write-Host "❌ Script not found at: $ScriptFile" -ForegroundColor Red
    Write-Host "Please update the ScriptPath parameter" -ForegroundColor Yellow
    exit 1
}

try {
    # Create the scheduled task action
    $Action = New-ScheduledTaskAction -Execute "python" -Argument "`"$ScriptFile`"" -WorkingDirectory $ScriptPath
    
    # Create the trigger (daily at specified time)
    $Trigger = New-ScheduledTaskTrigger -Daily -At $RunTime
    
    # Create task settings
    $Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
    
    # Create the principal (run as SYSTEM)
    $Principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
    
    # Register the scheduled task
    Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Principal $Principal -Description "Updates surf forecast and daily condition data from weather APIs"
    
    Write-Host "✅ Scheduled task created successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Task Details:" -ForegroundColor Cyan
    Write-Host "   • Name: $TaskName" -ForegroundColor White
    Write-Host "   • Schedule: Daily at $RunTime" -ForegroundColor White
    Write-Host "   • Script: $ScriptFile" -ForegroundColor White
    Write-Host ""
    Write-Host "🔧 Management Commands:" -ForegroundColor Cyan
    Write-Host "   • View task: Get-ScheduledTask -TaskName '$TaskName'" -ForegroundColor White
    Write-Host "   • Run now: Start-ScheduledTask -TaskName '$TaskName'" -ForegroundColor White
    Write-Host "   • Delete task: Unregister-ScheduledTask -TaskName '$TaskName'" -ForegroundColor White
    Write-Host ""
    Write-Host "📝 Logs will be written to: $ScriptPath\surf_update.log" -ForegroundColor Yellow

} catch {
    Write-Host "❌ Error creating scheduled task: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎯 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Test the task manually: Start-ScheduledTask -TaskName '$TaskName'" -ForegroundColor White
Write-Host "2. Check the log file after running" -ForegroundColor White
Write-Host "3. Monitor for a few days to ensure it runs properly" -ForegroundColor White