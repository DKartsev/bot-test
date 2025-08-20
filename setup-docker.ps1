# Simple Docker setup
Write-Host "Setting up Docker environment..." -ForegroundColor Blue

# Create directories
New-Item -ItemType Directory -Path "logs" -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path "data" -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path "nginx/ssl" -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path "nginx/conf.d" -Force -ErrorAction SilentlyContinue

Write-Host "Directories created" -ForegroundColor Green

# Copy environment file
if (Test-Path "docker.env") {
    Copy-Item "docker.env" ".env" -Force
    Write-Host ".env file created" -ForegroundColor Green
} else {
    Write-Host "docker.env not found" -ForegroundColor Red
}

# Create nginx config
$nginxConfig = @"
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server bot-backend:3000;
    }

    upstream admin {
        server bot-admin:3000;
    }

    server {
        listen 80;
        server_name localhost;

        location / {
            proxy_pass http://admin;
        }

        location /api/ {
            proxy_pass http://backend;
        }

        location /health {
            proxy_pass http://backend/api/health;
        }
    }
}
"@

$nginxConfig | Out-File -FilePath "nginx/nginx.conf" -Encoding UTF8
Write-Host "Nginx config created" -ForegroundColor Green

# Check files
Write-Host "Checking Docker files:" -ForegroundColor Cyan
if (Test-Path "docker-compose.yml") { Write-Host "✓ docker-compose.yml" -ForegroundColor Green }
if (Test-Path "docker-compose.override.yml") { Write-Host "✓ docker-compose.override.yml" -ForegroundColor Green }
if (Test-Path "Dockerfile.backend") { Write-Host "✓ Dockerfile.backend" -ForegroundColor Green }

Write-Host "Setup completed!" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Install Docker Desktop" -ForegroundColor White
Write-Host "2. Restart computer" -ForegroundColor White
Write-Host "3. Run: docker-compose up -d" -ForegroundColor White
