@echo off
setlocal enabledelayedexpansion

REM Скрипт для автоматического исправления ошибок линтинга (Windows)
REM Использование: scripts\fix-linting.bat

echo 🔧 Автоматическое исправление ошибок линтинга...

REM Проверяем, что мы в правильной директории
if not exist "package.json" (
  echo ❌ Ошибка: Запустите скрипт из корня backend пакета
  exit /b 1
)

REM Создаем backup директорию
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "YY=%dt:~2,2%" & set "YYYY=%dt:~0,4%" & set "MM=%dt:~4,2%" & set "DD=%dt:~6,2%"
set "HH=%dt:~8,2%" & set "Min=%dt:~10,2%" & set "Sec=%dt:~12,2%"
set "BACKUP_DIR=backup-%YYYY%%MM%%DD%-%HH%%Min%%Sec%"

echo 📦 Создаю backup в %BACKUP_DIR%
mkdir "%BACKUP_DIR%"

REM Backup исходных файлов
echo 💾 Создаю backup исходных файлов...
xcopy "src" "%BACKUP_DIR%\src" /E /I /Y >nul
echo ✅ Backup создан в %BACKUP_DIR%

REM Устанавливаем зависимости если нужно
if not exist "node_modules" (
  echo 📦 Устанавливаю зависимости...
  npm install
)

REM Запускаем автоматическое исправление
echo 🔧 Запускаю автоматическое исправление...
npm run lint:fix

REM Проверяем результат
echo 🔍 Проверяю результат исправления...
npm run lint

if %ERRORLEVEL% EQU 0 (
  echo ✅ Все ошибки линтинга исправлены автоматически!
  
  echo 📊 Статистика исправлений:
  echo    - Исходные файлы сохранены в: %BACKUP_DIR%
  echo    - Автоматически исправленные файлы: src/
  
  set /p "DELETE_BACKUP=🗑️  Удалить backup директорию? (y/N): "
  if /i "!DELETE_BACKUP!"=="y" (
    rmdir /s /q "%BACKUP_DIR%"
    echo ✅ Backup удален
  ) else (
    echo 💾 Backup сохранен в %BACKUP_DIR%
  )
) else (
  echo ⚠️  Некоторые ошибки не могут быть исправлены автоматически
  echo 🔍 Запускаю детальную проверку...
  npm run lint -- --format=stylish
  
  echo.
  echo 💡 Рекомендации по ручному исправлению:
  echo    1. Проверьте файлы с ошибками выше
  echo    2. Исправьте ошибки вручную
  echo    3. Запустите 'npm run lint' для проверки
  echo    4. Исходные файлы сохранены в %BACKUP_DIR%
  
  exit /b 1
)

echo.
echo 🎉 Готово! Теперь можете запустить тесты:
echo    npm run test:coverage

pause
