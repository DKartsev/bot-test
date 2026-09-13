# Rapira Chatwoot Mock Integration

Прототип показывает, как подключить пользовательские данные к боту/оператору поддержки Chatwoot через Captain Custom Tools и отдельный API.

Модель данных учитывает активные финансовые операции:

- пополнения: `СБП`, `P2P сделка`, `криптовалюта`, `наличные в офисе`;
- выводы: `P2P`, `криптовалюта`, `наличные в офисе`;
- для активных операций возвращаются сумма, токен, сеть, статус, ID операции, TXID для crypto и текущее время обработки;
- блок `support` намеренно не возвращается наружу: внутренние флаги и подсказки не должны попадать в интерфейс или клиентский API.

## Запуск

```bash
npm install
npm start
```

Откройте:

```text
http://localhost:8787/dashboard.html
```

## Captain API

Endpoint для Chatwoot Captain Custom Tool:

```http
POST /api/captain/user-context
Content-Type: application/json
```

Тело запроса:

```json
{
  "contact": {
    "email": "client@example.com",
    "phone": "+79990000000",
    "id": "123"
  },
  "operation_type": "deposit",
  "operation_id": "",
  "txid": ""
}
```

Endpoint принимает только `POST` с `Content-Type: application/json`.

Ошибки:

```json
{
  "error": "method_not_allowed",
  "message": "Use POST method"
}
```

HTTP status: `405` для любых методов кроме POST.

```json
{
  "error": "invalid_request",
  "message": "Request body must be valid JSON"
}
```

HTTP status: `400` для пустого тела, невалидного JSON или запроса без `Content-Type: application/json`.

```json
{
  "error": "missing_contact",
  "message": "Contact data is required"
}
```

HTTP status: `400`, если `contact.email`, `contact.phone` и `contact.id` пустые или отсутствуют.

`operation_type` управляет составом ответа:

- `balance` — баланс и общие ограничения;
- `deposit` — активные пополнения;
- `withdrawal` — активные выводы;
- `kyc` — статус верификации и ограничения;
- `p2p` — P2P-операции;
- `sbp` — СБП-операции;
- `crypto` — криптовалютные операции; если `txid` передан, поиск идет по нему;
- `cash` — наличные операции;
- `operation_status` — поиск по `operation_id` или `txid`.

Если `operation_id` передан, endpoint пытается найти конкретную операцию по ID. Если `txid` передан, endpoint ищет криптовалютную транзакцию по TXID/hash.

## Успешный ответ

```json
{
  "customer": "Имя клиента, email",
  "kyc_status": "verified",
  "withdrawal_enabled": true,
  "trading_enabled": true,
  "balances": [
    "RUB: доступно 132658, в холде 16021",
    "USDT: доступно 25, в холде 2"
  ],
  "active_deposits": [
    "СБП: 295221 RUB, статус pending_confirmation, в обработке 34 мин., ID dep_123"
  ],
  "active_withdrawals": [
    "P2P сделка: 63269 RUB, статус blocked, в обработке 25 мин., ID wd_123"
  ],
  "operation": {
    "id": "dep_123",
    "type": "deposit",
    "method": "СБП",
    "amount": 295221,
    "currency": "RUB",
    "token": null,
    "network": null,
    "status": "pending_confirmation",
    "processing_time": "34 мин.",
    "txid": null
  },
  "public_recommendation": "Сообщите клиенту статус операции и попросите чек, если требуется проверка.",
  "instruction": "Используй эти данные для ответа клиенту. Не раскрывай risk_level, last_login_ip и внутренние технические причины ограничений."
}
```

Если операция не найдена:

```json
{
  "customer": "Имя клиента, email",
  "kyc_status": "not_started",
  "withdrawal_enabled": false,
  "trading_enabled": true,
  "balances": [],
  "active_deposits": [],
  "active_withdrawals": [],
  "operation": null,
  "public_recommendation": "Операция по указанным данным не найдена. Попросите клиента проверить ID операции или TXID/hash и при необходимости передайте обращение специалисту.",
  "instruction": "Не придумывай данные операции. Попроси корректный ID операции или TXID/hash."
}
```

## Настройка Chatwoot Captain Tool

Метод: `POST`

Endpoint URL:

```text
https://rapira-chatwoot-mock.onrender.com/api/captain/user-context
```

Authentication: `None`

Шаблон тела запроса:

```json
{
  "contact": {
    "email": "{{ contact.email }}",
    "phone": "{{ contact.phone_number }}",
    "id": "{{ contact.id }}"
  },
  "operation_type": "{{ operation_type }}",
  "operation_id": "{{ operation_id }}",
  "txid": "{{ txid }}"
}
```

Шаблон ответа:

```liquid
Данные клиента Rapira:

Клиент: {{ response.customer }}
Статус верификации: {{ response.kyc_status }}
Вывод доступен: {{ response.withdrawal_enabled }}
Торговля доступна: {{ response.trading_enabled }}

Балансы:
{{ response.balances }}

Активные пополнения:
{{ response.active_deposits }}

Активные выводы:
{{ response.active_withdrawals }}

Операция:
{{ response.operation }}

Рекомендация:
{{ response.public_recommendation }}

Правила ответа:
{{ response.instruction }}
```

## Логика бота

Captain должен использовать инструмент перед ответом на вопросы о пополнениях, выводах, балансе, верификации, P2P, СБП, криптовалюте или наличных.

Не раскрывать клиенту `risk_level`, `last_login_ip`, внутренние технические причины ограничений и приватные служебные заметки.

Если данных недостаточно, попросить ID операции, TXID/hash, чек оплаты или уточнить актив/сеть.
