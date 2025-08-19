@echo off
REM Скрипт для автоматического коммита изменений
REM Использование: auto-commit.bat [сообщение_коммита]

if "%1"=="" (
    set "COMMIT_MSG=Автоматический коммит: обновления"
) else (
    set "COMMIT_MSG=%1"
)

echo 🔄 Проверка статуса Git...
git status --porcelain >nul 2>&1
if %errorlevel% neq 0 (
    echo ✅ Нет изменений для коммита
    exit /b 0
)

echo 📝 Найдены изменения:
git status --short

echo 📁 Добавление всех файлов...
git add .

echo 💾 Создание коммита...
git commit --no-verify -m "%COMMIT_MSG%"
if %errorlevel% equ 0 (
    echo ✅ Коммит успешно создан: %COMMIT_MSG%
    
    echo 📋 Последний коммит:
    git log -1 --oneline
    
    echo 🎉 Автоматический коммит завершен!
) else (
    echo ❌ Ошибка при создании коммита
    exit /b 1
)
