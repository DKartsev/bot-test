# Daily commit script
# Automatically commits changes with current date and pushes to remote

$date = Get-Date -Format "yyyy-MM-dd"
$time = Get-Date -Format "HH:mm"
$message = "Daily commit: $date at $time"

Write-Host "Creating daily commit with auto-push: $message" -ForegroundColor Cyan
.\auto-commit.ps1 $message
