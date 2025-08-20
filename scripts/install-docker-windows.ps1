# PowerShell скрипт для автоматической установки Docker на Windows
# Запускать от имени администратора

param(
    [switch]$SkipWSL = $false,
    [switch]$SkipDockerDesktop = $false
)

# Функция для логирования
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

# Проверка прав администратора
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Log "Этот скрипт должен быть запущен от имени администратора!" "ERROR"
    exit 1
}

Write-Log "Начинаем установку Docker на Windows..."

# 1. Включение WSL (если не пропущено)
if (-not $SkipWSL) {
    Write-Log "Включаем WSL..."
    
    try {
        # Включение WSL
        dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
        Write-Log "WSL включен" "SUCCESS"
        
        # Включение виртуальной машины
        dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
        Write-Log "Virtual Machine Platform включен" "SUCCESS"
        
    } catch {
        Write-Log "Ошибка при включении WSL: $_" "ERROR"
        exit 1
    }
}

# 2. Скачивание и установка Docker Desktop
if (-not $SkipDockerDesktop) {
    Write-Log "Скачиваем Docker Desktop..."
    
    $dockerUrl = "https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe"
    $installerPath = "$env:TEMP\DockerDesktopInstaller.exe"
    
    try {
        # Скачивание установщика
        Invoke-WebRequest -Uri $dockerUrl -OutFile $installerPath
        Write-Log "Docker Desktop скачан" "SUCCESS"
        
        # Запуск установщика
        Write-Log "Запускаем установщик Docker Desktop..."
        Write-Log "Пожалуйста, следуйте инструкциям установщика и выберите 'Use WSL 2 instead of Hyper-V'"
        
        Start-Process -FilePath $installerPath -Wait
        
        # Удаление установщика
        Remove-Item $installerPath -Force
        
        Write-Log "Docker Desktop установлен" "SUCCESS"
        
    } catch {
        Write-Log "Ошибка при установке Docker Desktop: $_" "ERROR"
        exit 1
    }
}

# 3. Настройка WSL 2
Write-Log "Настраиваем WSL 2..."

try {
    # Создание конфигурационного файла WSL
    $wslConfigPath = "$env:USERPROFILE\.wslconfig"
    $wslConfig = @"
[wsl2]
memory=4GB
processors=2
swap=2GB
localhostForwarding=true
"@
    
    $wslConfig | Out-File -FilePath $wslConfigPath -Encoding UTF8
    Write-Log "WSL конфигурация создана" "SUCCESS"
    
} catch {
    Write-Log "Ошибка при создании конфигурации WSL: $_" "WARNING"
}

# 4. Установка WSL 2
Write-Log "Устанавливаем WSL 2..."

try {
    # Установка WSL 2
    wsl --install -d Ubuntu
    Write-Log "WSL 2 с Ubuntu установлен" "SUCCESS"
    
} catch {
    Write-Log "Ошибка при установке WSL 2: $_" "WARNING"
}

# 5. Проверка установки
Write-Log "Проверяем установку..."

try {
    # Проверка WSL
    $wslStatus = wsl --list --verbose 2>$null
    if ($wslStatus) {
        Write-Log "WSL статус:" "SUCCESS"
        Write-Host $wslStatus
    }
    
    # Проверка Docker (если установлен)
    if (Get-Command docker -ErrorAction SilentlyContinue) {
        $dockerVersion = docker --version 2>$null
        Write-Log "Docker версия: $dockerVersion" "SUCCESS"
    } else {
        Write-Log "Docker не найден в PATH" "WARNING"
    }
    
} catch {
    Write-Log "Ошибка при проверке установки: $_" "WARNING"
}

# 6. Инструкции по завершению
Write-Log "Установка завершена!" "SUCCESS"
Write-Log ""
Write-Log "Для завершения настройки:"
Write-Log "1. Перезагрузите компьютер"
Write-Log "2. Запустите Docker Desktop"
Write-Log "3. Дождитесь инициализации Docker"
Write-Log "4. Проверьте работу: docker run hello-world"
Write-Log ""
Write-Log "После этого можно использовать команды:"
Write-Log "  make dev      # Запуск в development режиме"
Write-Log "  make prod     # Запуск в production режиме"
Write-Log "  make test-docker # Тестирование Docker конфигурации"

# 7. Перезагрузка (опционально)
$restart = Read-Host "Перезагрузить компьютер сейчас? (y/N)"
if ($restart -match "^[Yy]$") {
    Write-Log "Перезагружаем компьютер..."
    Restart-Computer
}
