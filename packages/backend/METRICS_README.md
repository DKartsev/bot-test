# 📈 Система метрик и мониторинга производительности

## Обзор

Система метрик и мониторинга предоставляет комплексное решение для сбора, анализа и визуализации данных о производительности приложения. Включает в себя метрики HTTP запросов, системных ресурсов, базы данных, Redis и пользовательские метрики.

## 🏗️ Архитектура

### 1. Сборщик метрик (`src/services/metricsCollector.ts`)

Центральный компонент для сбора и хранения метрик:

```typescript
// Типы метрик
export enum MetricType {
  COUNTER = 'counter',    // Счетчик (увеличивается)
  GAUGE = 'gauge',        // Измеритель (произвольное значение)
  HISTOGRAM = 'histogram', // Гистограмма (распределение значений)
  SUMMARY = 'summary',     // Сводка (квантили)
}

// Увеличение счетчика
metricsCollector.incrementCounter('http_requests_total', {
  method: 'GET',
  path: '/api/users',
  status_code: '200'
});

// Установка значения gauge
metricsCollector.setGauge('memory_usage_bytes', process.memoryUsage().heapUsed);

// Добавление в гистограмму
metricsCollector.addToHistogram('response_time_ms', duration);

// Измерение времени
const timer = metricsCollector.startTimer('database_query_duration');
// ... выполнение операции
timer(); // завершение измерения
```

### 2. Middleware для автоматического сбора (`src/middleware/metricsMiddleware.ts`)

Автоматически собирает метрики для различных компонентов:

- **HTTP Metrics**: время ответа, коды состояния, размер ответа
- **Error Metrics**: типы ошибок, количество ошибок
- **System Metrics**: память, CPU, uptime
- **Database Metrics**: время выполнения запросов, ошибки
- **Redis Metrics**: производительность кэша
- **WebSocket Metrics**: подключения, сообщения

### 3. API для работы с метриками (`src/routes/metrics.ts`)

REST API для доступа к метрикам и управления системой:

- `GET /api/metrics/performance` - статистика производительности API
- `GET /api/metrics/system` - системные метрики
- `GET /api/metrics/redis` - метрики Redis
- `GET /api/metrics/histogram/{name}` - данные гистограммы
- `GET /api/metrics/export` - экспорт метрик (JSON/Prometheus)
- `GET /api/metrics/collector/stats` - статистика сборщика
- `PUT /api/metrics/collector/config` - обновление конфигурации
- `POST /api/metrics/reset` - сброс метрик

## 🚀 Использование

### Основные endpoint'ы

```bash
# Статистика производительности API
curl "http://localhost:3000/api/metrics/performance"

# Системные метрики
curl "http://localhost:3000/api/metrics/system"

# Метрики Redis
curl "http://localhost:3000/api/metrics/redis"

# Экспорт метрик в формате Prometheus
curl "http://localhost:3000/api/metrics/export?format=prometheus"
```

### Интеграция в код

```typescript
import { metricsCollector } from './services/metricsCollector';

// В функции обработки запроса
export async function processOrder(orderId: string) {
  const timer = metricsCollector.startTimer('order_processing_duration', {
    type: 'standard'
  });

  try {
    // Увеличиваем счетчик попыток
    metricsCollector.incrementCounter('order_processing_attempts', {
      type: 'standard'
    });

    // Обрабатываем заказ
    const result = await processOrderLogic(orderId);
    
    // Успешная обработка
    metricsCollector.incrementCounter('order_processing_success', {
      type: 'standard'
    });

    return result;
  } catch (error) {
    // Ошибка обработки
    metricsCollector.incrementCounter('order_processing_errors', {
      type: 'standard',
      error_type: error.name
    });
    throw error;
  } finally {
    timer(); // Завершаем измерение времени
  }
}
```

### Настройка middleware

Middleware автоматически подключается в `src/index.ts`:

```typescript
// Система метрик (должна быть рано в цепочке middleware)
app.use(httpMetricsMiddleware);        // HTTP метрики
app.use(systemMetricsMiddleware);      // Системные метрики
app.use(redisMetricsMiddleware);       // Redis метрики

// Обработка ошибок с метриками
app.use(errorMetricsMiddleware);       // Метрики ошибок
```

## 📊 Типы метрик

### 1. HTTP метрики

Автоматически собираются для всех HTTP запросов:

```json
{
  "counters": {
    "http_requests_total{method=\"GET\",path=\"/api/users\",status_code=\"200\"}": 1250,
    "http_responses_total{method=\"GET\",path=\"/api/users\",status_code=\"200\"}": 1250,
    "http_errors_total{method=\"POST\",path=\"/api/orders\",status_code=\"400\"}": 15
  },
  "histograms": {
    "http_request_duration_ms": {
      "count": 1250,
      "sum": 125000,
      "avg": 100,
      "p50": 85,
      "p95": 250,
      "p99": 500
    },
    "http_response_size_bytes": {
      "count": 1250,
      "sum": 2500000,
      "avg": 2000
    }
  },
  "gauges": {
    "http_requests_active": 5
  }
}
```

### 2. Системные метрики

Информация о состоянии системы:

```json
{
  "system": {
    "memory": {
      "used": 52428800,
      "free": 71663616,
      "total": 124092416,
      "usage": 42.25
    },
    "cpu": {
      "usage": 1234567,
      "loadAverage": [0.5, 0.7, 0.8]
    },
    "uptime": 3600,
    "nodeVersion": "v18.17.0",
    "platform": "linux"
  }
}
```

### 3. Метрики производительности API

Детальная статистика работы API:

```json
{
  "performance": {
    "totalRequests": 10000,
    "totalErrors": 150,
    "averageResponseTime": 125.5,
    "requestsPerSecond": 2.78,
    "errorRate": 1.5,
    "slowestEndpoints": [
      {
        "path": "/api/reports/generate",
        "method": "POST",
        "averageTime": 2500,
        "requestCount": 50
      }
    ],
    "fastestEndpoints": [
      {
        "path": "/health",
        "method": "GET",
        "averageTime": 5,
        "requestCount": 500
      }
    ],
    "statusCodeDistribution": {
      "200": 8500,
      "201": 1000,
      "400": 100,
      "404": 30,
      "500": 20
    },
    "topUserAgents": [
      {
        "userAgent": "Mozilla/5.0 (Chrome)",
        "count": 5000
      }
    ]
  }
}
```

### 4. Redis метрики

Состояние и производительность Redis:

```json
{
  "redis": {
    "isConnected": true,
    "usedMemory": 1048576,
    "connectedClients": 5,
    "commandsProcessed": 50000,
    "hitRate": 85.5,
    "missRate": 14.5,
    "keyCount": 1000,
    "expiredKeys": 50
  }
}
```

### 5. Метрики базы данных

Производительность SQL запросов:

```json
{
  "database": {
    "connectionCount": 10,
    "activeQueries": 2,
    "queryExecutionTime": {
      "count": 5000,
      "avg": 50,
      "p95": 200,
      "p99": 500
    },
    "slowQueries": [
      {
        "query": "SELECT * FROM users WHERE...",
        "executionTime": 1500,
        "timestamp": 1642678800000
      }
    ],
    "errorCount": 25,
    "transactionCount": 500
  }
}
```

## 🔧 Конфигурация

### Настройки сборщика метрик

```typescript
interface MetricsConfig {
  enabled: boolean;                    // Включить сбор метрик
  retentionPeriod: number;            // Период хранения (мс)
  batchSize: number;                  // Размер батча для сброса
  flushInterval: number;              // Интервал сброса (мс)
  enableRedisStorage: boolean;        // Хранение в Redis
  enableMemoryStorage: boolean;       // Хранение в памяти
  histogramBuckets: number[];         // Buckets для гистограмм
}
```

### Переменные окружения

```env
# Metrics Configuration
METRICS_ENABLED=true
METRICS_RETENTION_PERIOD=86400000     # 24 часа
METRICS_BATCH_SIZE=1000
METRICS_FLUSH_INTERVAL=60000          # 1 минута
METRICS_REDIS_STORAGE=true
METRICS_MEMORY_STORAGE=true
```

### Обновление конфигурации через API

```bash
curl -X PUT "http://localhost:3000/api/metrics/collector/config" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "retentionPeriod": 86400000,
    "batchSize": 500,
    "flushInterval": 30000
  }'
```

## 📈 Мониторинг и алертинг

### Ключевые метрики для мониторинга

1. **Производительность API**:
   - `http_request_duration_ms` (p95, p99)
   - `http_requests_per_second`
   - `http_error_rate`

2. **Системные ресурсы**:
   - `system_memory_usage_percent`
   - `system_cpu_usage`
   - `system_load_average`

3. **База данных**:
   - `database_query_duration_ms` (p95)
   - `database_connection_count`
   - `database_error_rate`

4. **Redis**:
   - `redis_hit_rate`
   - `redis_used_memory`
   - `redis_connected_clients`

### Настройка алертов

Примеры условий для алертов:

```yaml
alerts:
  - name: "Высокое время ответа API"
    condition: "http_request_duration_ms.p95 > 1000"
    severity: "warning"
    
  - name: "Высокий процент ошибок"
    condition: "http_error_rate > 5"
    severity: "critical"
    
  - name: "Высокое использование памяти"
    condition: "system_memory_usage_percent > 80"
    severity: "warning"
    
  - name: "Низкий hit rate Redis"
    condition: "redis_hit_rate < 70"
    severity: "warning"
```

## 🔍 Анализ производительности

### Анализ медленных endpoint'ов

```bash
# Получаем статистику производительности за последние 2 часа
curl "http://localhost:3000/api/metrics/performance?timeRange=7200000"
```

Ответ покажет самые медленные endpoint'ы:

```json
{
  "slowestEndpoints": [
    {
      "path": "/api/reports/complex",
      "method": "POST",
      "averageTime": 3500,
      "requestCount": 25
    },
    {
      "path": "/api/data/export",
      "method": "GET", 
      "averageTime": 2800,
      "requestCount": 15
    }
  ]
}
```

### Анализ гистограммы времени ответа

```bash
# Получаем детальную статистику времени ответа
curl "http://localhost:3000/api/metrics/histogram/http_request_duration_ms"
```

Ответ содержит процентили и распределение:

```json
{
  "data": {
    "count": 10000,
    "sum": 1250000,
    "min": 5,
    "max": 5000,
    "avg": 125,
    "p50": 100,
    "p95": 300,
    "p99": 800,
    "buckets": {
      "100": 7500,
      "250": 8800,
      "500": 9500,
      "1000": 9800,
      "2500": 9950,
      "5000": 10000
    }
  }
}
```

### Анализ ошибок

```bash
# Получаем метрики ошибок с фильтрацией
curl "http://localhost:3000/api/metrics/histogram/application_errors_total?labels={\"error_type\":\"validation\"}"
```

## 🔄 Интеграция с внешними системами

### Экспорт в Prometheus

```bash
# Получаем метрики в формате Prometheus
curl "http://localhost:3000/api/metrics/export?format=prometheus" > metrics.txt
```

Пример вывода:

```
# TYPE http_requests_total counter
http_requests_total{method="GET",path="/api/users"} 1250 1642678800000

# TYPE http_request_duration_ms histogram
http_request_duration_ms_bucket{le="100"} 7500 1642678800000
http_request_duration_ms_bucket{le="250"} 8800 1642678800000
http_request_duration_ms_sum 1250000 1642678800000
http_request_duration_ms_count 10000 1642678800000
```

### Интеграция с Grafana

1. Настройте Prometheus для сбора метрик:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'telegram-bot-api'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/api/metrics/export'
    params:
      format: ['prometheus']
```

2. Создайте дашборд в Grafana с панелями:
   - График времени ответа API
   - Счетчик RPS (requests per second)
   - Процент ошибок
   - Использование системных ресурсов
   - Статистика Redis

### Интеграция с ELK Stack

```bash
# Экспорт метрик в JSON для Elasticsearch
curl "http://localhost:3000/api/metrics/export?format=json" | \
  jq '.data' | \
  curl -X POST "http://elasticsearch:9200/metrics/_doc" \
    -H "Content-Type: application/json" \
    -d @-
```

## 🧪 Тестирование системы метрик

### Нагрузочное тестирование

```bash
# Генерируем нагрузку для проверки метрик
for i in {1..1000}; do
  curl -s "http://localhost:3000/api/users" > /dev/null &
done

# Проверяем собранные метрики
curl "http://localhost:3000/api/metrics/performance"
```

### Тестирование ошибок

```bash
# Генерируем ошибки для проверки их учета
for i in {1..50}; do
  curl -s "http://localhost:3000/api/nonexistent" > /dev/null &
done

# Проверяем метрики ошибок
curl "http://localhost:3000/api/metrics/histogram/http_errors_total"
```

## 🛠️ Техническое обслуживание

### Мониторинг состояния сборщика

```bash
# Статистика сборщика метрик
curl "http://localhost:3000/api/metrics/collector/stats"
```

Ответ:

```json
{
  "data": {
    "totalMetrics": 15000,
    "totalCounters": 50,
    "totalGauges": 20,
    "totalHistograms": 10,
    "activeTimers": 3,
    "memoryUsage": 2048576,
    "config": {
      "enabled": true,
      "retentionPeriod": 86400000,
      "batchSize": 1000,
      "flushInterval": 60000
    }
  }
}
```

### Очистка метрик

```bash
# Сброс всех метрик
curl -X POST "http://localhost:3000/api/metrics/reset"
```

### Health Check с метриками

```bash
curl "http://localhost:3000/health"
```

Включает информацию о метриках:

```json
{
  "status": "ok",
  "metrics": {
    "totalMetrics": 15000,
    "totalCounters": 50,
    "totalGauges": 20,
    "totalHistograms": 10,
    "memoryUsage": 2048576
  },
  "system": {
    "memoryUsage": 42,
    "nodeVersion": "v18.17.0",
    "platform": "linux"
  }
}
```

## 🎯 Лучшие практики

### 1. Именование метрик

```typescript
// ✅ Хорошо: описательные имена с единицами измерения
metricsCollector.addToHistogram('database_query_duration_ms', duration);
metricsCollector.setGauge('memory_usage_bytes', bytes);
metricsCollector.incrementCounter('orders_processed_total', { status: 'success' });

// ❌ Плохо: неясные имена
metricsCollector.addToHistogram('time', duration);
metricsCollector.setGauge('mem', bytes);
metricsCollector.incrementCounter('cnt', { s: 'ok' });
```

### 2. Использование лейблов

```typescript
// ✅ Хорошо: осмысленные лейблы с ограниченным количеством значений
metricsCollector.incrementCounter('api_requests_total', {
  method: 'GET',
  endpoint: '/api/users',
  status_code: '200'
});

// ❌ Плохо: лейблы с высокой кардинальностью
metricsCollector.incrementCounter('api_requests_total', {
  user_id: '12345',  // Высокая кардинальность!
  timestamp: '2024-01-15T10:30:00Z'  // Уникальные значения!
});
```

### 3. Производительность

```typescript
// ✅ Хорошо: используйте таймеры для измерения производительности
const timer = metricsCollector.startTimer('operation_duration');
try {
  await performOperation();
} finally {
  timer(); // Всегда завершайте измерение
}

// ✅ Хорошо: группируйте связанные метрики
const startTime = Date.now();
const result = await processData();
const duration = Date.now() - startTime;

metricsCollector.addToHistogram('data_processing_duration_ms', duration);
metricsCollector.incrementCounter('data_processing_total', { status: 'success' });
metricsCollector.setGauge('data_items_processed', result.itemCount);
```

### 4. Обработка ошибок

```typescript
// ✅ Хорошо: всегда учитывайте ошибки в метриках
try {
  const result = await apiCall();
  metricsCollector.incrementCounter('api_calls_total', { status: 'success' });
  return result;
} catch (error) {
  metricsCollector.incrementCounter('api_calls_total', { 
    status: 'error',
    error_type: error.name 
  });
  throw error;
}
```

## 🔮 Планы развития

### Краткосрочные улучшения

- [ ] Автоматическое обнаружение аномалий в метриках
- [ ] Интеграция с системами алертинга (PagerDuty, Slack)
- [ ] Сжатие исторических данных
- [ ] Поддержка custom метрик через конфигурацию

### Долгосрочные улучшения

- [ ] Распределенная система сбора метрик
- [ ] Машинное обучение для предсказания проблем
- [ ] Автоматическое масштабирование на основе метрик
- [ ] Интеграция с Kubernetes metrics

## 📚 Дополнительные ресурсы

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Node.js Performance Monitoring](https://nodejs.org/en/docs/guides/simple-profiling/)
- [OpenTelemetry](https://opentelemetry.io/)

## 🎉 Заключение

Система метрик и мониторинга предоставляет полный контроль над производительностью приложения. Автоматический сбор метрик, гибкая конфигурация, множественные форматы экспорта и удобные API позволяют эффективно отслеживать состояние системы и быстро реагировать на проблемы.

Основные преимущества:
- **Автоматический сбор**: метрики собираются без дополнительного кода
- **Низкие накладные расходы**: оптимизированная производительность
- **Гибкая конфигурация**: настройка под любые потребности
- **Множественные форматы**: JSON, Prometheus, HTML
- **Интеграция**: готовность к работе с внешними системами
- **Масштабируемость**: поддержка высоких нагрузок
- **Наблюдаемость**: полная видимость работы системы
