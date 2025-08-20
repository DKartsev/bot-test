# Wait for Docker to be ready
Write-Host "Waiting for Docker to be ready..." -ForegroundColor Blue

$maxAttempts = 30
$attempt = 0

while ($attempt -lt $maxAttempts) {
    $attempt++
    Write-Host "Attempt $attempt/$maxAttempts - Checking Docker..." -ForegroundColor Yellow
    
    try {
        # Try to get Docker info
        $dockerInfo = docker info 2>$null
        if ($dockerInfo -and $dockerInfo -notmatch "ERROR") {
            Write-Host "✅ Docker is ready!" -ForegroundColor Green
            break
        }
    } catch {
        # Ignore errors
    }
    
    if ($attempt -lt $maxAttempts) {
        Write-Host "Docker not ready yet, waiting 10 seconds..." -ForegroundColor Yellow
        Start-Sleep -Seconds 10
    }
}

if ($attempt -ge $maxAttempts) {
    Write-Host "❌ Docker is still not ready after $maxAttempts attempts" -ForegroundColor Red
    Write-Host "Try restarting Docker Desktop manually" -ForegroundColor Yellow
    exit 1
}

# Test with hello-world
Write-Host "Testing Docker with hello-world container..." -ForegroundColor Cyan
try {
    docker run --rm hello-world
    Write-Host "✅ Docker is working correctly!" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker test failed: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎉 Docker is ready to use!" -ForegroundColor Green
Write-Host "You can now run:" -ForegroundColor Cyan
Write-Host "  .\quick-start.ps1" -ForegroundColor White
