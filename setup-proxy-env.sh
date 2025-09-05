#!/bin/bash

# Скрипт для настройки переменных окружения для HTTP-прокси

echo "🔧 Настройка переменных окружения для HTTP-прокси..."

# Настройки прокси
PROXY_HOST="193.233.115.178"
PROXY_PORT="11403"
PROXY_USERNAME="aUGIll6zoH"
PROXY_PASSWORD="KFu2uvbHBx"

# Создаем прокси URL
PROXY_URL="http://${PROXY_USERNAME}:${PROXY_PASSWORD}@${PROXY_HOST}:${PROXY_PORT}"

# Экспортируем переменные окружения
export HTTPS_PROXY="$PROXY_URL"
export HTTP_PROXY="$PROXY_URL"
export https_proxy="$PROXY_URL"
export http_proxy="$PROXY_URL"

# Показываем настройки
echo "✅ Переменные окружения установлены:"
echo "   HTTPS_PROXY=$HTTPS_PROXY"
echo "   HTTP_PROXY=$HTTP_PROXY"
echo "   https_proxy=$https_proxy"
echo "   http_proxy=$http_proxy"

# Проверяем наличие OpenAI API ключа
if [ -z "$OPENAI_API_KEY" ]; then
    echo "⚠️  Внимание: Переменная OPENAI_API_KEY не установлена"
    echo "   Установите её командой: export OPENAI_API_KEY='your-api-key-here'"
else
    echo "✅ OPENAI_API_KEY установлен"
fi

echo ""
echo "🚀 Теперь можно запустить тест:"
echo "   node test-openai-proxy.js"
echo ""
echo "   Или с автоматической настройкой прокси:"
echo "   npm run test-with-env"
