# Quick Docker start script
Write-Host "🚀 Quick Docker start..." -ForegroundColor Green

# Check if Docker is available
try {
    $dockerVersion = docker --version
    Write-Host "✅ Docker is available: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not available" -ForegroundColor Red
    Write-Host "Please install Docker Desktop first" -ForegroundColor Yellow
    exit 1
}

# Build images
Write-Host "🔨 Building Docker images..." -ForegroundColor Yellow
docker-compose build

# Start services in development mode
Write-Host "🚀 Starting services in development mode..." -ForegroundColor Yellow
docker-compose -f docker-compose.yml -f docker-compose.override.yml --profile dev up -d

Write-Host "✅ Ready! Services are available:" -ForegroundColor Green
Write-Host "   Backend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "   Admin: http://localhost:3001" -ForegroundColor Cyan
Write-Host "   Health: http://localhost:3000/api/health" -ForegroundColor Cyan

Write-Host ""
Write-Host "Useful commands:" -ForegroundColor White
Write-Host "  docker-compose logs -f    # View logs" -ForegroundColor Gray
Write-Host "  docker-compose down       # Stop services" -ForegroundColor Gray
Write-Host "  docker-compose ps         # Check status" -ForegroundColor Gray
