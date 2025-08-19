# Daily commit script
# Automatically commits changes with current date

$date = Get-Date -Format "yyyy-MM-dd"
$time = Get-Date -Format "HH:mm"
$message = "Daily commit: $date at $time"

Write-Host "Creating daily commit: $message" -ForegroundColor Cyan
.\auto-commit.ps1 $message
