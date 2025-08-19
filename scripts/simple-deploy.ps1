# Simple deploy script for VM
param(
    [string]$VMIP = "84.201.146.125",
    [string]$SSHKeyPath = "yandex-vm-key",
    [string]$VMUser = "dankartsev",
    [string]$ProjectPath = "~/bot-project"
)

Write-Host "🚀 Starting deployment to VM $VMIP" -ForegroundColor Green

# Check if dist directory exists
if (-not (Test-Path "dist")) {
    Write-Host "❌ dist directory not found. Please build the project first." -ForegroundColor Red
    exit 1
}

# Check SSH key
if (-not (Test-Path $SSHKeyPath)) {
    Write-Host "❌ SSH key not found: $SSHKeyPath" -ForegroundColor Red
    exit 1
}

# Create deployment archive
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$archiveName = "deploy-${timestamp}.zip"

Write-Host "📦 Creating deployment archive..." -ForegroundColor Blue
try {
    Compress-Archive -Path "dist" -DestinationPath $archiveName -Force
    Write-Host "✅ Archive created: $archiveName" -ForegroundColor Green
} catch {
    Write-Host "❌ Error creating archive: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Copy archive to VM
Write-Host "📤 Copying archive to VM..." -ForegroundColor Blue
try {
    $result = scp -i $SSHKeyPath $archiveName "${VMUser}@${VMIP}:$ProjectPath/" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Archive copied successfully" -ForegroundColor Green
    } else {
        Write-Host "❌ Copy failed: $result" -ForegroundColor Red
        Remove-Item $archiveName -Force
        exit 1
    }
} catch {
    Write-Host "❌ Copy error: $($_.Exception.Message)" -ForegroundColor Red
    Remove-Item $archiveName -Force
    exit 1
}

# Deploy on VM
Write-Host "📦 Deploying on VM..." -ForegroundColor Blue
$deployCommands = @(
    "cd $ProjectPath",
    "rm -rf dist-old",
    "if [ -d 'dist' ]; then mv dist dist-old; fi",
    "unzip -o $archiveName",
    "rm $archiveName"
)

$deployScript = $deployCommands -join " ; "

try {
    $result = ssh -i $SSHKeyPath "${VMUser}@${VMIP}" $deployScript 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Deployment completed successfully" -ForegroundColor Green
    } else {
        Write-Host "❌ Deployment failed: $result" -ForegroundColor Red
        Remove-Item $archiveName -Force
        exit 1
    }
} catch {
    Write-Host "❌ Deployment error: $($_.Exception.Message)" -ForegroundColor Red
    Remove-Item $archiveName -Force
    exit 1
}

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Blue
try {
    $installScript = "cd $ProjectPath/dist && npm ci --production"
    $result = ssh -i $SSHKeyPath "${VMUser}@${VMIP}" $installScript 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Dependencies installed" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Dependencies installation failed: $result" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️ Dependencies installation error: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Restart services
Write-Host "🔄 Restarting services..." -ForegroundColor Blue
try {
    $restartScript = "cd $ProjectPath/dist && pm2 reload ecosystem.config.js || pm2 start ecosystem.config.js && pm2 save"
    $result = ssh -i $SSHKeyPath "${VMUser}@${VMIP}" $restartScript 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Services restarted" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Service restart failed: $result" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️ Service restart error: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Check status
Write-Host "🔍 Checking service status..." -ForegroundColor Blue
try {
    $status = ssh -i $SSHKeyPath "${VMUser}@${VMIP}" "pm2 status" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "📊 PM2 Status:" -ForegroundColor Blue
        Write-Host $status -ForegroundColor White
    } else {
        Write-Host "⚠️ Could not get PM2 status: $status" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️ Status check error: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Cleanup local archive
Remove-Item $archiveName -Force
Write-Host "✅ Local archive removed" -ForegroundColor Green

Write-Host "🎉 Deployment completed successfully!" -ForegroundColor Green
