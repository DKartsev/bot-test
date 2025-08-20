# Simple Docker setup script
Write-Host "Setting up Docker environment..." -ForegroundColor Blue

# Create directories
$dirs = @("logs", "data", "nginx/ssl", "nginx/conf.d")
foreach ($d in $dirs) {
    if (-not (Test-Path $d)) {
        New-Item -ItemType Directory -Path $d -Force | Out-Null
        Write-Host "Created: $d" -ForegroundColor Green
    } else {
        Write-Host "Exists: $d" -ForegroundColor Yellow
    }
}

# Copy environment file
if (Test-Path "docker.env") {
    if (-not (Test-Path ".env")) {
        Copy-Item "docker.env" ".env"
        Write-Host "Created .env file" -ForegroundColor Green
    } else {
        Write-Host ".env file already exists" -ForegroundColor Yellow
    }
} else {
    Write-Host "docker.env not found" -ForegroundColor Red
}

# Create nginx config
$nginxPath = "nginx/nginx.conf"
if (-not (Test-Path $nginxPath)) {
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
    
    $nginxConfig | Out-File -FilePath $nginxPath -Encoding UTF8
    Write-Host "Created nginx config" -ForegroundColor Green
} else {
    Write-Host "Nginx config already exists" -ForegroundColor Yellow
}

# Check Docker files
$files = @("docker-compose.yml", "docker-compose.override.yml", "Dockerfile.backend")
foreach ($f in $files) {
    if (Test-Path $f) {
        Write-Host "✓ $f" -ForegroundColor Green
    } else {
        Write-Host "✗ $f" -ForegroundColor Red
    }
}

Write-Host "Setup completed!" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Install Docker Desktop" -ForegroundColor White
Write-Host "2. Restart computer" -ForegroundColor White
Write-Host "3. Run: docker-compose up -d" -ForegroundColor White
