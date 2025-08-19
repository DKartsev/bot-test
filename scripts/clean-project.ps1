# PowerShell script for cleaning project from temporary and unnecessary files
# Usage: .\scripts\clean-project.ps1

param(
    [switch]$Force
)

# Colors for output
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$White = "White"

Write-Host "Starting project cleanup..." -ForegroundColor $Green

# Function for safe removal
function Remove-Safe {
    param([string]$Path, [string]$Description)
    
    if (Test-Path $Path) {
        try {
            Remove-Item -Path $Path -Recurse -Force -ErrorAction Stop
            Write-Host "Removed: $Description" -ForegroundColor $Green
        } catch {
            Write-Host "Failed to remove ${Description}: $($_.Exception.Message)" -ForegroundColor $Yellow
        }
    }
}

# Remove temporary files and directories
Write-Host "Removing temporary files..." -ForegroundColor $Yellow

# Node.js
Remove-Safe "node_modules" "Node.js dependencies"
Get-ChildItem -Path "packages" -Directory | ForEach-Object {
    Remove-Safe "$($_.FullName)\node_modules" "Node.js dependencies in $($_.Name)"
}
Remove-Safe "package-lock.json" "package-lock.json"
Get-ChildItem -Path "packages" -Directory | ForEach-Object {
    Remove-Safe "$($_.FullName)\package-lock.json" "package-lock.json in $($_.Name)"
}

# Build outputs
Remove-Safe "dist" "Backend build"
Remove-Safe "build" "Build directory"
Remove-Safe "packages\operator-admin\.next" "Next.js build"
Remove-Safe "packages\operator-admin\out" "Next.js output"
Remove-Safe "packages\operator-admin\admin-out" "Admin output"

# Logs
Remove-Safe "logs" "Application logs"
Get-ChildItem -Path "." -Filter "*.log" | Remove-Item -Force
Get-ChildItem -Path "packages" -Recurse -Filter "*.log" | Remove-Item -Force

# Coverage
Remove-Safe "coverage" "Coverage reports"
Get-ChildItem -Path "packages" -Directory | ForEach-Object {
    Remove-Safe "$($_.FullName)\coverage" "Coverage in $($_.Name)"
}
Get-ChildItem -Path "." -Filter "*.lcov" | Remove-Item -Force
Get-ChildItem -Path "packages" -Recurse -Filter "*.lcov" | Remove-Item -Force

# Cache
Remove-Safe ".npm" "NPM cache"
Remove-Safe ".eslintcache" "ESLint cache"
Remove-Safe ".cache" "Cache directory"
Remove-Safe ".parcel-cache" "Parcel cache"
Remove-Safe ".turbo" "Turborepo cache"

# IDE
Remove-Safe ".vscode" "VS Code settings"
Remove-Safe ".idea" "IntelliJ IDEA settings"
Get-ChildItem -Path "." -Filter "*.swp" | Remove-Item -Force
Get-ChildItem -Path "." -Filter "*.swo" | Remove-Item -Force
Get-ChildItem -Path "." -Filter "*~" | Remove-Item -Force

# OS
Remove-Safe ".DS_Store" "macOS file"
Remove-Safe "Thumbs.db" "Windows file"

# PM2
Remove-Safe ".pm2" "PM2 directory"

# Test results
Remove-Safe "test-results" "Test results"
Get-ChildItem -Path "packages" -Directory | ForEach-Object {
    Remove-Safe "$($_.FullName)\test-results" "Test results in $($_.Name)"
}
Get-ChildItem -Path "." -Filter "test-results.xml" | Remove-Item -Force

# Backup directories
Get-ChildItem -Path "." -Directory -Filter "backup-*" | Remove-Item -Recurse -Force
Get-ChildItem -Path "packages" -Directory | ForEach-Object {
    Get-ChildItem -Path $_.FullName -Directory -Filter "backup-*" | Remove-Item -Recurse -Force
}

# Python cache
Get-ChildItem -Path "." -Recurse -Directory -Filter "__pycache__" | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
Get-ChildItem -Path "." -Recurse -Filter "*.pyc" | Remove-Item -Force -ErrorAction SilentlyContinue
Get-ChildItem -Path "." -Recurse -Filter "*.pyo" | Remove-Item -Force -ErrorAction SilentlyContinue

# Temporary files
Remove-Safe "tmp" "Temporary directory"
Remove-Safe "temp" "Temp directory"
Get-ChildItem -Path "." -Filter "*.tmp" | Remove-Item -Force
Get-ChildItem -Path "." -Filter "*.backup" | Remove-Item -Force
Get-ChildItem -Path "." -Filter "*.bak" | Remove-Item -Force

# Render specific files
Get-ChildItem -Path "." -Filter "render.yaml" | Remove-Item -Force
Get-ChildItem -Path "." -Filter "render-*.yaml" | Remove-Item -Force

# Auto-generated documentation
Get-ChildItem -Path "." -Filter "AUTO_COMMIT_README.md" | Remove-Item -Force
Get-ChildItem -Path "." -Filter "DEPLOYMENT*.md" | Remove-Item -Force
Get-ChildItem -Path "." -Filter "QUICK_*.md" | Remove-Item -Force
Get-ChildItem -Path "." -Filter "DEBUGGING_*.md" | Remove-Item -Force
Get-ChildItem -Path "." -Filter "MIGRATION_*.md" | Remove-Item -Force
Get-ChildItem -Path "." -Filter "GEMINI.md" | Remove-Item -Force
Get-ChildItem -Path "." -Filter "AGENTS.md" | Remove-Item -Force

# Docker
Remove-Safe ".dockerignore" ".dockerignore file"

Write-Host "Cleanup completed!" -ForegroundColor $Green

# Create clean .gitignore
Write-Host "Creating clean .gitignore..." -ForegroundColor $Yellow

$gitignoreContent = @"
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Build outputs
dist/
build/
.next/
out/
admin-out/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/
*.lcov

# nyc test coverage
.nyc_output

# Dependency directories
jspm_packages/

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Microbundle cache
.rpt2_cache/
.rts2_cache_cjs/
.rts2_cache_es/
.rts2_cache_umd/

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variables file
.env.test

# parcel-bundler cache (https://parceljs.org/)
.cache
.parcel-cache

# Next.js build output
.next
out

# Nuxt.js build / generate output
.nuxt
dist

# Storybook build outputs
.out
.storybook-out

# Temporary folders
tmp/
temp/

# Editor directories and files
.vscode/
.idea/
*.swp
*.swo
*~

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# PM2
.pm2/

# Docker
.dockerignore

# Backup files
*.backup
*.bak
*.tmp

# Test files
test-results/
playwright-report/
test-results.xml

# Local development
.local/
local/

# Python cache
__pycache__/
*.py[cod]
*$py.class

# Backup directories
backup-*/
"@

$gitignoreContent | Out-File -FilePath ".gitignore" -Encoding UTF8
Write-Host ".gitignore updated" -ForegroundColor $Green

# Create .dockerignore
Write-Host "Creating .dockerignore..." -ForegroundColor $Yellow

$dockerignoreContent = @"
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Build outputs
dist/
build/
.next/
out/
admin-out/

# Environment files
.env*
!.env.example

# Logs
logs/
*.log

# Test files
coverage/
test-results/
*.test.ts
*.spec.ts

# Development files
.vscode/
.idea/
*.swp
*.swo

# Git
.git/
.gitignore

# Documentation
README.md
*.md
docs/

# Scripts
scripts/
.github/

# Temporary files
tmp/
temp/
*.tmp
*.backup

# OS files
.DS_Store
Thumbs.db

# Python files
*.py
__pycache__/

# Backup directories
backup-*/
"@

$dockerignoreContent | Out-File -FilePath ".dockerignore" -Encoding UTF8
Write-Host ".dockerignore created" -ForegroundColor $Green

Write-Host "Project cleaned and ready for VM deployment!" -ForegroundColor $Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor $Yellow
Write-Host "1. Setup environment variables: Copy-Item env-template.txt .env" -ForegroundColor $White
Write-Host "2. Install dependencies: npm install" -ForegroundColor $White
Write-Host "3. Build project: npm run build" -ForegroundColor $White
Write-Host "4. Run deployment: .\scripts\deploy-vm.ps1 -VMIP <VM_IP> -SSHKeyPath <SSH_KEY_PATH>" -ForegroundColor $White
