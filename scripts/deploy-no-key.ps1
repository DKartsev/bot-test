# Deploy script without SSH key (using password)
Write-Host "Starting deployment..." -ForegroundColor Green

# Check dist directory
if (-not (Test-Path "dist")) {
    Write-Host "dist directory not found!" -ForegroundColor Red
    exit 1
}

# Create archive
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$archiveName = "deploy-$timestamp.zip"

Write-Host "Creating archive: $archiveName" -ForegroundColor Blue
Compress-Archive -Path "dist" -DestinationPath $archiveName -Force

# Copy to VM using scp with password
Write-Host "Copying to VM..." -ForegroundColor Blue
Write-Host "Note: You will be prompted for password" -ForegroundColor Yellow
scp $archiveName "dankartsev@84.201.146.125:~/bot-project/"

# Deploy on VM
Write-Host "Deploying on VM..." -ForegroundColor Blue
Write-Host "Note: You will be prompted for password" -ForegroundColor Yellow
$deployCmd = "cd ~/bot-project && rm -rf dist-old && if [ -d 'dist' ]; then mv dist dist-old; fi && unzip -o $archiveName && rm $archiveName"
ssh -l dankartsev 84.201.146.125 $deployCmd

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Blue
Write-Host "Note: You will be prompted for password" -ForegroundColor Yellow
ssh -l dankartsev 84.201.146.125 "cd ~/bot-project/dist && npm ci --production"

# Restart services
Write-Host "Restarting services..." -ForegroundColor Blue
Write-Host "Note: You will be prompted for password" -ForegroundColor Yellow
ssh -l dankartsev 84.201.146.125 "cd ~/bot-project/dist && pm2 reload ecosystem.config.js || pm2 start ecosystem.config.js"

# Check status
Write-Host "Checking status..." -ForegroundColor Blue
Write-Host "Note: You will be prompted for password" -ForegroundColor Yellow
ssh -l dankartsev 84.201.146.125 "pm2 status"

# Cleanup
Remove-Item $archiveName -Force
Write-Host "Deployment completed!" -ForegroundColor Green
