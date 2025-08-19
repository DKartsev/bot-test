# PowerShell script for checking project readiness for VM deployment
# Usage: .\scripts\check-deploy-readiness.ps1

param(
    [switch]$Verbose
)

# Colors for output
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Blue = "Blue"
$White = "White"

Write-Host "Checking project readiness for VM deployment..." -ForegroundColor $Blue
Write-Host ""

# Counters
$TotalChecks = 0
$PassedChecks = 0
$FailedChecks = 0

# Function for checking
function Test-Item {
    param(
        [string]$Description,
        [scriptblock]$CheckCommand,
        [string]$SuccessMessage,
        [string]$FailureMessage
    )
    
    $script:TotalChecks++
    
    try {
        $result = & $CheckCommand
        if ($result) {
            Write-Host "PASS: $Description" -ForegroundColor $Green
            $script:PassedChecks++
            if ($SuccessMessage) {
                Write-Host "   $SuccessMessage" -ForegroundColor $Blue
            }
        } else {
            Write-Host "FAIL: $Description" -ForegroundColor $Red
            $script:FailedChecks++
            if ($FailureMessage) {
                Write-Host "   $FailureMessage" -ForegroundColor $Yellow
            }
        }
    } catch {
        Write-Host "FAIL: $Description" -ForegroundColor $Red
        $script:FailedChecks++
        if ($FailureMessage) {
            Write-Host "   $FailureMessage" -ForegroundColor $Yellow
        }
    }
    Write-Host ""
}

# Project structure check
Write-Host "Project structure check:" -ForegroundColor $Blue

Test-Item "Root package.json" { Test-Path "package.json" } "Main dependencies file found" "Create package.json in project root"
Test-Item "Backend directory" { Test-Path "packages\backend" } "Backend code found" "Create packages\backend directory"
Test-Item "Admin directory" { Test-Path "packages\operator-admin" } "Admin panel found" "Create packages\operator-admin directory"
Test-Item "Shared directory" { Test-Path "packages\shared" } "Shared types found" "Create packages\shared directory"

# Configuration files check
Write-Host "Configuration files check:" -ForegroundColor $Blue

Test-Item "PM2 configuration" { Test-Path "ecosystem.config.js" } "PM2 configuration ready" "Create ecosystem.config.js"
Test-Item "Docker Compose" { Test-Path "docker-compose.yml" } "Docker configuration ready" "Create docker-compose.yml"
Test-Item "TypeScript configuration" { Test-Path "tsconfig.json" } "TypeScript configured" "Create tsconfig.json"
Test-Item "Environment variables" { Test-Path "env-template.txt" } "Environment template ready" "Create env-template.txt"

# Scripts check
Write-Host "Scripts check:" -ForegroundColor $Blue

Test-Item "Deploy script (Linux)" { Test-Path "scripts\deploy-vm.sh" } "Linux deploy script ready" "Create scripts\deploy-vm.sh"
Test-Item "Deploy script (Windows)" { Test-Path "scripts\deploy-vm.ps1" } "Windows deploy script ready" "Create scripts\deploy-vm.ps1"
Test-Item "Clean script (Linux)" { Test-Path "scripts\clean-project.sh" } "Linux clean script ready" "Create scripts\clean-project.sh"
Test-Item "Clean script (Windows)" { Test-Path "scripts\clean-project.ps1" } "Windows clean script ready" "Create scripts\clean-project.ps1"

# Nginx configuration check
Write-Host "Nginx configuration check:" -ForegroundColor $Blue

Test-Item "Nginx directory" { Test-Path "nginx" } "Nginx configuration found" "Create nginx directory"
Test-Item "Nginx configuration" { Test-Path "nginx\nginx.conf" } "Nginx configuration ready" "Create nginx\nginx.conf"

# Docker files check
Write-Host "Docker files check:" -ForegroundColor $Blue

Test-Item "Dockerfile for backend" { Test-Path "Dockerfile.backend" } "Backend Dockerfile ready" "Create Dockerfile.backend"
Test-Item "Dockerfile for admin" { Test-Path "packages\operator-admin\Dockerfile.admin" } "Admin Dockerfile ready" "Create packages\operator-admin\Dockerfile.admin"

# Dependencies check
Write-Host "Dependencies check:" -ForegroundColor $Blue

Test-Item "Root dependencies" { (Get-Content "package.json" | Select-String "pm2") -ne $null } "PM2 added to dependencies" "Add pm2 to package.json"
Test-Item "Backend dependencies" { (Get-Content "packages\backend\package.json" | Select-String "fastify") -ne $null } "Fastify found in backend dependencies" "Add fastify to packages\backend\package.json"
Test-Item "Admin dependencies" { (Get-Content "packages\operator-admin\package.json" | Select-String "next") -ne $null } "Next.js found in admin dependencies" "Add next to packages\operator-admin\package.json"

# Source code check
Write-Host "Source code check:" -ForegroundColor $Blue

Test-Item "Backend main.ts" { Test-Path "packages\backend\src\main.ts" } "Backend entry point found" "Create packages\backend\src\main.ts"
Test-Item "Admin page" { Test-Path "packages\operator-admin\src\app\page.tsx" } "Admin main page found" "Create packages\operator-admin\src\app\page.tsx"

# Documentation check
Write-Host "Documentation check:" -ForegroundColor $Blue

Test-Item "Deploy README" { Test-Path "README-VM-DEPLOY.md" } "Deployment documentation ready" "Create README-VM-DEPLOY.md"
Test-Item "Main README" { Test-Path "README.md" } "Main README ready" "Create README.md"

# Final statistics
Write-Host "Final statistics:" -ForegroundColor $Blue
Write-Host "PASSED: $PassedChecks" -ForegroundColor $Green
Write-Host "FAILED: $FailedChecks" -ForegroundColor $Red
Write-Host "TOTAL: $TotalChecks" -ForegroundColor $Blue

# Recommendations
Write-Host ""
if ($FailedChecks -eq 0) {
    Write-Host "Project is fully ready for VM deployment!" -ForegroundColor $Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor $Blue
    Write-Host "1. Setup environment variables: Copy-Item env-template.txt .env" -ForegroundColor $White
    Write-Host "2. Install dependencies: npm install" -ForegroundColor $White
    Write-Host "3. Build project: npm run build" -ForegroundColor $White
    Write-Host "4. Run deployment: .\scripts\deploy-vm.ps1 -VMIP <VM_IP> -SSHKeyPath <SSH_KEY_PATH>" -ForegroundColor $White
} else {
    Write-Host "Project requires fixes before deployment" -ForegroundColor $Yellow
    Write-Host ""
    Write-Host "Recommendations:" -ForegroundColor $Blue
    Write-Host "1. Fix all failed checks" -ForegroundColor $White
    Write-Host "2. Run cleanup script: .\scripts\clean-project.ps1" -ForegroundColor $White
    Write-Host "3. Re-run readiness check: .\scripts\check-deploy-readiness.ps1" -ForegroundColor $White
    Write-Host "4. After fixing all issues, run deployment" -ForegroundColor $White
}

Write-Host ""
Write-Host "For detailed information see README-VM-DEPLOY.md" -ForegroundColor $Blue

# Return error code if there are issues
if ($FailedChecks -gt 0) {
    exit 1
}
