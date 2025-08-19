#!/bin/bash

# Скрипт для автоматического исправления ошибок линтинга
# Использование: ./scripts/fix-linting.sh

set -e

echo "🔧 Автоматическое исправление ошибок линтинга..."

# Проверяем, что мы в правильной директории
if [ ! -f "package.json" ]; then
  echo "❌ Ошибка: Запустите скрипт из корня backend пакета"
  exit 1
fi

# Создаем backup директорию
BACKUP_DIR="./backup-$(date +%Y%m%d-%H%M%S)"
echo "📦 Создаю backup в $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

# Backup исходных файлов
echo "💾 Создаю backup исходных файлов..."
cp -r src "$BACKUP_DIR/"
echo "✅ Backup создан в $BACKUP_DIR"

# Устанавливаем зависимости если нужно
if [ ! -d "node_modules" ]; then
  echo "📦 Устанавливаю зависимости..."
  npm install
fi

# Запускаем автоматическое исправление
echo "🔧 Запускаю автоматическое исправление..."
npm run lint:fix

# Проверяем результат
echo "🔍 Проверяю результат исправления..."
npm run lint

if [ $? -eq 0 ]; then
  echo "✅ Все ошибки линтинга исправлены автоматически!"
  
  # Показываем статистику
  echo "📊 Статистика исправлений:"
  echo "   - Исходные файлы сохранены в: $BACKUP_DIR"
  echo "   - Автоматически исправленные файлы: src/"
  
  # Предлагаем удалить backup если все хорошо
  read -p "🗑️  Удалить backup директорию? (y/N): " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm -rf "$BACKUP_DIR"
    echo "✅ Backup удален"
  else
    echo "💾 Backup сохранен в $BACKUP_DIR"
  fi
else
  echo "⚠️  Некоторые ошибки не могут быть исправлены автоматически"
  echo "🔍 Запускаю детальную проверку..."
  npm run lint -- --format=stylish
  
  echo ""
  echo "💡 Рекомендации по ручному исправлению:"
  echo "   1. Проверьте файлы с ошибками выше"
  echo "   2. Исправьте ошибки вручную"
  echo "   3. Запустите 'npm run lint' для проверки"
  echo "   4. Исходные файлы сохранены в $BACKUP_DIR"
  
  exit 1
fi

echo ""
echo "🎉 Готово! Теперь можете запустить тесты:"
echo "   npm run test:coverage"
