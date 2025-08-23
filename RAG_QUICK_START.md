# 🚀 RAG Пайплайн - Быстрый старт

## Что это?

Полноценный пайплайн гибридного RAG с использованием OpenAI GPT-4o mini для интеллектуальной обработки запросов пользователей.

## Архитектура

```
Вопрос → Переформулировка → Гибридный поиск → Draft → RAG/Refine → Ответ
```

## Быстрый запуск

### 1. Установка зависимостей

```bash
# Установка OpenAI пакета
make rag-install-deps

# Или вручную
cd packages/backend && npm install openai@^4.20.1
```

### 2. Настройка переменных окружения

Создайте файл `.env` в `packages/backend/`:

```bash
# OpenAI
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MAX_TOKENS=4000
OPENAI_TEMPERATURE=0.3
OPENAI_TIMEOUT=30000
```

### 3. Запуск backend

```bash
# Сборка
make rag-build

# Запуск в режиме разработки
make rag-start

# Или вручную
cd packages/backend && npm run dev
```

### 4. Тестирование

```bash
# Проверка здоровья сервиса
make rag-health

# Полная проверка пайплайна
make rag-test

# Демонстрация
make rag-demo
```

## API Endpoints

- `GET /api/rag/health` - Проверка здоровья
- `POST /api/rag/query` - Основной запрос
- `POST /api/rag/test` - Тестирование
- `GET /api/rag/stats` - Статистика
- `GET /api/rag/model-info` - Информация о модели

## Пример использования

### Python

```python
from tools.bot_search import RAGClient

client = RAGClient("http://localhost:3000")

response = client.process_query(
    question="Как пополнить баланс через QR-код?",
    context="Пользователь интересуется способами пополнения"
)

print(response["data"]["answer"])
```

### cURL

```bash
curl -X POST http://localhost:3000/api/rag/query \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Как пополнить баланс через QR-код?",
    "context": "Пользователь интересуется способами пополнения"
  }'
```

## Команды Make

```bash
make rag-install-deps    # Установка зависимостей
make rag-build          # Сборка
make rag-start          # Запуск
make rag-test           # Тестирование
make rag-demo           # Демонстрация
make rag-health         # Проверка здоровья
make rag-stats          # Статистика
make rag-model-info     # Информация о модели
```

## Troubleshooting

### OpenAI API недоступен
- Проверьте API ключ
- Проверьте сетевое подключение
- Проверьте лимиты API

### Сервис не запускается
- Проверьте переменные окружения
- Проверьте порт 3000
- Проверьте логи

### Низкое качество ответов
- Настройте веса поиска
- Улучшите промпты
- Проверьте качество источников

## Следующие шаги

1. Настройте реальные источники данных
2. Интегрируйте с существующей системой
3. Настройте мониторинг и метрики
4. Оптимизируйте производительность

## Поддержка

- Документация: `RAG_PIPELINE_README.md`
- Тесты: `tools/test_rag.py`
- Демо: `tools/bot_search.py`
