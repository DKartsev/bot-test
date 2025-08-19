# Быстрый скрипт синхронизации без архивов
param(
    [string]$Action = "sync"
)

$VMUser = "dankartsev"
$VMIP = "84.201.146.125"
$VMProjectPath = "~/bot-project"

Write-Host "⚡ Быстрая синхронизация без архивов..." -ForegroundColor Green
Write-Host "VM: ${VMUser}@${VMIP}:${VMProjectPath}" -ForegroundColor Blue

if ($Action.ToLower() -eq "sync") {
    Write-Host "🔄 Синхронизируем основные файлы..." -ForegroundColor Blue
    
    # Отправляем только ключевые файлы
    $keyFiles = @("package.json", "tsconfig.json", "env-template.txt")
    
    foreach ($file in $keyFiles) {
        if (Test-Path $file) {
            Write-Host "📤 Отправляем $file..." -ForegroundColor Yellow
            scp $file "${VMUser}@${VMIP}:${VMProjectPath}/"
        }
    }
    
    # Отправляем только src (основной код)
    if (Test-Path "src") {
        Write-Host "📤 Отправляем src/..." -ForegroundColor Yellow
        scp -r src "${VMUser}@${VMIP}:${VMProjectPath}/"
    }
    
    # Отправляем только packages (без node_modules)
    if (Test-Path "packages") {
        Write-Host "📤 Отправляем packages/..." -ForegroundColor Yellow
        scp -r packages "${VMUser}@${VMIP}:${VMProjectPath}/"
    }
    
    # Отправляем только scripts
    if (Test-Path "scripts") {
        Write-Host "📤 Отправляем scripts/..." -ForegroundColor Yellow
        scp -r scripts "${VMUser}@${VMIP}:${VMProjectPath}/"
    }
    
    Write-Host "✅ Синхронизация завершена!" -ForegroundColor Green
}
elseif ($Action.ToLower() -eq "status") {
    Write-Host "📊 Проверяем статус..." -ForegroundColor Blue
    
    # Проверяем VM
    Write-Host "🔍 VM статус:" -ForegroundColor Yellow
    ssh -l $VMUser $VMIP "cd $VMProjectPath ; echo 'VM доступна' ; ls -la | head -10"
    
    # Проверяем PM2
    Write-Host "🔍 PM2 статус:" -ForegroundColor Yellow
    ssh -l $VMUser $VMIP "pm2 status"
}
else {
    Write-Host "❌ Неизвестное действие: $Action" -ForegroundColor Red
    Write-Host "Доступные действия: sync, status" -ForegroundColor Yellow
}

Write-Host "🎯 Готово!" -ForegroundColor Green
