# PowerShell скрипт для установки Docker через Chocolatey
# Запускать от имени администратора

param(
    [switch]$InstallChocolatey = $true,
    [switch]$InstallDocker = $true
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

Write-Log "Начинаем установку Docker через Chocolatey..."

# 1. Установка Chocolatey (если не пропущено)
if ($InstallChocolatey) {
    Write-Log "Устанавливаем Chocolatey..."
    
    try {
        # Установка Chocolatey
        Set-ExecutionPolicy Bypass -Scope Process -Force
        [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
        iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
        
        # Обновление PATH
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        
        Write-Log "Chocolatey установлен" "SUCCESS"
        
    } catch {
        Write-Log "Ошибка при установке Chocolatey: $_" "ERROR"
        exit 1
    }
}

# 2. Установка Docker (если не пропущено)
if ($InstallDocker) {
    Write-Log "Устанавливаем Docker через Chocolatey..."
    
    try {
        # Установка Docker
        choco install docker-desktop -y
        
        # Обновление PATH
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        
        Write-Log "Docker установлен" "SUCCESS"
        
    } catch {
        Write-Log "Ошибка при установке Docker: $_" "ERROR"
        exit 1
    }
}

# 3. Проверка установки
Write-Log "Проверяем установку..."

try {
    # Проверка Chocolatey
    if (Get-Command choco -ErrorAction SilentlyContinue) {
        $chocoVersion = choco --version 2>$null
        Write-Log "Chocolatey версия: $chocoVersion" "SUCCESS"
    } else {
        Write-Log "Chocolatey не найден" "WARNING"
    }
    
    # Проверка Docker
    if (Get-Command docker -ErrorAction SilentlyContinue) {
        $dockerVersion = docker --version 2>$null
        Write-Log "Docker версия: $dockerVersion" "SUCCESS"
    } else {
        Write-Log "Docker не найден в PATH" "WARNING"
    }
    
} catch {
    Write-Log "Ошибка при проверке установки: $_" "WARNING"
}

# 4. Инструкции по завершению
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

# 5. Перезагрузка (опционально)
$restart = Read-Host "Перезагрузить компьютер сейчас? (y/N)"
if ($restart -match "^[Yy]$") {
    Write-Log "Перезагружаем компьютер..."
    Restart-Computer
}
