# Тестирование OpenAI API через HTTP-прокси

Этот набор скриптов позволяет протестировать подключение к OpenAI API через HTTP-прокси.

## Настройки прокси

- **Протокол**: HTTP
- **Адрес**: 193.233.115.178
- **Порт**: 11403
- **Логин**: aUGIll6zoH
- **Пароль**: KFu2uvbHBx

## Установка зависимостей

```bash
# Установка зависимостей
npm install openai https-proxy-agent

# Или скопируйте package.json и установите
cp test-package.json package.json
npm install
```

## Настройка переменных окружения

### Способ 1: Автоматическая настройка

```bash
# Запустите скрипт настройки
chmod +x setup-proxy-env.sh
source setup-proxy-env.sh

# Установите API ключ OpenAI
export OPENAI_API_KEY="your-api-key-here"
```

### Способ 2: Ручная настройка

```bash
# Установите переменные окружения
export HTTPS_PROXY="http://aUGIll6zoH:KFu2uvbHBx@193.233.115.178:11403"
export HTTP_PROXY="http://aUGIll6zoH:KFu2uvbHBx@193.233.115.178:11403"
export OPENAI_API_KEY="your-api-key-here"
```

## Запуск тестов

### Способ 1: Прямой запуск

```bash
# Убедитесь, что переменные окружения установлены
node test-openai-proxy.js
```

### Способ 2: Через npm скрипт

```bash
# Запуск с автоматической настройкой прокси
npm run test-with-env
```

### Способ 3: Через source

```bash
# Настройка и запуск в одной команде
source setup-proxy-env.sh && node test-openai-proxy.js
```

## Что делает тест

1. **Проверяет подключение** к OpenAI API через HTTP-прокси
2. **Получает список моделей** и ищет gpt-4o-mini
3. **Отправляет сообщение** "Hello from VM" в gpt-4o-mini
4. **Выводит ответ** и статистику использования токенов

## Ожидаемый результат

При успешном подключении вы увидите:

```
🔧 Настройки прокси:
   Host: 193.233.115.178:11403
   Username: aUGIll6zoH
   Proxy URL: http://aUGIll6zoH:***@193.233.115.178:11403

🚀 Тестируем подключение к OpenAI API через HTTP-прокси...

📋 Получаем список доступных моделей...
✅ Получено X моделей
✅ Модель gpt-4o-mini найдена: gpt-4o-mini

💬 Отправляем сообщение в gpt-4o-mini...
✅ Ответ получен:
   Модель: gpt-4o-mini
   Ответ: Hello! How can I help you today?
   Токены: 15 (prompt: 8, completion: 7)

🎉 Тест успешно завершен! OpenAI API работает через HTTP-прокси.
```

## Устранение неполадок

### Ошибка "API key not found"
```bash
export OPENAI_API_KEY="your-actual-api-key"
```

### Ошибка подключения к прокси
- Проверьте правильность данных прокси
- Убедитесь, что прокси-сервер доступен
- Проверьте, что порт 11403 открыт

### Ошибка 403 Forbidden
- Проверьте правильность API ключа OpenAI
- Убедитесь, что аккаунт OpenAI активен
- Проверьте, что прокси обходит географические ограничения

## Интеграция в основной проект

После успешного тестирования добавьте в `packages/backend/src/services/openai.ts`:

```typescript
import { HttpsProxyAgent } from 'https-proxy-agent';

const proxyUrl = 'http://aUGIll6zoH:KFu2uvbHBx@193.233.115.178:11403';
const httpsAgent = new HttpsProxyAgent(proxyUrl);

// В конструкторе OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  httpAgent: httpsAgent,
});
```
