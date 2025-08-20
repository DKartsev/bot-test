# Fix Docker PATH script
Write-Host "Fixing Docker PATH..." -ForegroundColor Blue

# Add Docker to PATH for current session
$dockerPath = "C:\Program Files\Docker\Docker\resources\bin"
$env:PATH += ";$dockerPath"

Write-Host "Docker added to PATH for current session" -ForegroundColor Green

# Check if Docker is now available
try {
    $dockerVersion = docker --version
    Write-Host "✅ Docker is available: $dockerVersion" -ForegroundColor Green
    
    $composeVersion = docker-compose --version
    Write-Host "✅ Docker Compose is available: $composeVersion" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Docker is still not available" -ForegroundColor Red
}

Write-Host ""
Write-Host "Note: This fixes PATH only for current session." -ForegroundColor Yellow
Write-Host "For permanent fix, restart PowerShell or add to system PATH." -ForegroundColor Yellow
Write-Host ""
Write-Host "To add Docker to system PATH permanently:" -ForegroundColor Cyan
Write-Host "1. Open System Properties > Environment Variables" -ForegroundColor White
Write-Host "2. Add 'C:\Program Files\Docker\Docker\resources\bin' to PATH" -ForegroundColor White
Write-Host "3. Restart PowerShell" -ForegroundColor White
