# PowerShell script for Docker environment setup
# This script configures environment variables and checks readiness for Docker

# Logging function
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $color = switch ($Level) {
        "ERROR" { "Red" }
        "SUCCESS" { "Green" }
        "WARNING" { "Yellow" }
        default { "Blue" }
    }
    
    Write-Host "[$timestamp] $Message" -ForegroundColor $color
}

Write-Log "Setting up Docker environment..."

# 1. Create directories for Docker
Write-Log "Creating Docker directories..."

$directories = @(
    "logs",
    "data",
    "nginx/ssl",
    "nginx/conf.d"
)

foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Log "Created directory: $dir" "SUCCESS"
    } else {
        Write-Log "Directory already exists: $dir" "INFO"
    }
}

# 2. Create .env file from docker.env
Write-Log "Configuring environment variables..."

if (Test-Path "docker.env") {
    if (-not (Test-Path ".env")) {
        Copy-Item "docker.env" ".env"
        Write-Log "File .env created from docker.env" "SUCCESS"
    } else {
        Write-Log "File .env already exists" "INFO"
    }
} else {
    Write-Log "File docker.env not found" "WARNING"
}

# 3. Check Make availability
Write-Log "Checking Make availability..."

if (Get-Command make -ErrorAction SilentlyContinue) {
    $makeVersion = make --version 2>$null | Select-Object -First 1
    Write-Log "Make is available: $makeVersion" "SUCCESS"
} else {
    Write-Log "Make not found. Installing via Chocolatey..." "WARNING"
    
    try {
        # Try to install Make via Chocolatey
        if (Get-Command choco -ErrorAction SilentlyContinue) {
            choco install make -y
            Write-Log "Make installed" "SUCCESS"
        } else {
            Write-Log "Chocolatey not found. Install Make manually" "ERROR"
        }
    } catch {
        Write-Log "Error installing Make: $_" "ERROR"
    }
}

# 4. Create basic nginx configuration
Write-Log "Creating basic nginx configuration..."

$nginxConfPath = "nginx/nginx.conf"
if (-not (Test-Path $nginxConfPath)) {
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
            proxy_set_header Host `$host;
            proxy_set_header X-Real-IP `$remote_addr;
        }

        location /api/ {
            proxy_pass http://backend;
            proxy_set_header Host `$host;
            proxy_set_header X-Real-IP `$remote_addr;
        }

        location /health {
            proxy_pass http://backend/api/health;
        }
    }
}
"@
    
    $nginxConfig | Out-File -FilePath $nginxConfPath -Encoding UTF8
    Write-Log "Nginx configuration created" "SUCCESS"
} else {
    Write-Log "Nginx configuration already exists" "INFO"
}

# 5. Check .dockerignore
Write-Log "Checking .dockerignore..."

if (-not (Test-Path ".dockerignore")) {
    Write-Log ".dockerignore not found, using existing one" "INFO"
}

# 6. Check Docker files
Write-Log "Checking Docker files..."

$dockerFiles = @(
    "docker-compose.yml",
    "docker-compose.override.yml",
    "Dockerfile.backend",
    "packages/operator-admin/Dockerfile.admin"
)

foreach ($file in $dockerFiles) {
    if (Test-Path $file) {
        Write-Log "✓ $file found" "SUCCESS"
    } else {
        Write-Log "✗ $file not found" "ERROR"
    }
}

# 7. Create quick start script
Write-Log "Creating quick start script..."

$quickStartScript = @"
# Quick Docker start (run after Docker installation)
Write-Host "🚀 Quick Docker start..." -ForegroundColor Green

# Check Docker
if (Get-Command docker -ErrorAction SilentlyContinue) {
    Write-Host "✅ Docker is installed" -ForegroundColor Green
    
    # Build images
    Write-Host "🔨 Building images..." -ForegroundColor Yellow
    docker-compose build
    
    # Start in development mode
    Write-Host "🚀 Starting in development mode..." -ForegroundColor Yellow
    docker-compose -f docker-compose.yml -f docker-compose.override.yml --profile dev up -d
    
    Write-Host "✅ Ready! Services available:" -ForegroundColor Green
    Write-Host "   Backend: http://localhost:3000" -ForegroundColor Cyan
    Write-Host "   Admin: http://localhost:3001" -ForegroundColor Cyan
    Write-Host "   Health: http://localhost:3000/api/health" -ForegroundColor Cyan
    
} else {
    Write-Host "❌ Docker not installed" -ForegroundColor Red
    Write-Host "Install Docker Desktop or use WSL 2" -ForegroundColor Yellow
}
"@

$quickStartScript | Out-File -FilePath "quick-start-docker.ps1" -Encoding UTF8
Write-Log "Quick start script created: quick-start-docker.ps1" "SUCCESS"

# 8. Final check
Write-Log "Environment setup completed!" "SUCCESS"
Write-Log ""
Write-Log "📋 What to do next:"
Write-Log "1. Install Docker Desktop or Docker Engine"
Write-Log "2. Restart computer"
Write-Log "3. Run: .\quick-start-docker.ps1"
Write-Log ""
Write-Log "📚 Documentation:"
Write-Log "- README_DOCKER.md - quick start"
Write-Log "- DOCKER_README.md - detailed guide"
Write-Log "- DOCKER_INSTALL_WINDOWS.md - Docker installation"
Write-Log ""
Write-Log "🔧 Useful commands after Docker installation:"
Write-Log "  make help          # Show all commands"
Write-Log "  make dev           # Start development"
Write-Log "  make prod          # Start production"
Write-Log "  make test-docker   # Testing"
Write-Log "  make sync-vm-auto  # Sync with VM"
