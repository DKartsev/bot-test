# Backend - Миграция и исправление проблем

## 🚀 Быстрое исправление проблем

### 1. Автоматическое исправление
```bash
npm run fix-issues
```

### 2. Проверка и настройка базы данных
```bash
npm run check-db
npm run setup-db
```

### 3. Запуск backend
```bash
npm run dev
```

## 🔧 Основные проблемы и решения

### Проблема 1: Backend недоступен
**Причина**: Отсутствует файл .env или неправильная конфигурация

**Решение**:
1. Файл .env уже создан с правильными настройками
2. База данных настроена на VM 158.160.169.147
3. CORS настроен для localhost:3001 и VM:3001

### Проблема 2: Ошибка с загрузкой чатов
**Причина**: Проблемы с подключением к базе данных или отсутствующие таблицы

**Решение**:
1. База данных PostgreSQL установлена на VM
2. Таблицы создаются автоматически через `npm run setup-db`
3. ChatRepository обновлен для работы с отсутствующими таблицами

## 🌐 Миграция с Supabase на PostgreSQL

### Преимущества миграции:
- ✅ Полный контроль над базой данных
- ✅ Быстрое подключение к VM
- ✅ Удобство разработки
- ✅ Отсутствие платы за Supabase

### Этапы миграции:

#### 1. Установка PostgreSQL на VM
```bash
# На VM 158.160.169.147
ssh -l dankartsev 158.160.169.147

# Скопируйте и выполните скрипт установки
chmod +x install-postgresql-vm.sh
./install-postgresql-vm.sh
```

#### 2. Миграция данных
```bash
# Локально
npm run migrate-from-supabase
```

#### 3. Проверка
```bash
npm run check-db
npm run dev
```

## 📁 Структура файлов

```
scripts/
├── check-db.ts              # Проверка подключения к БД
├── setup-db.ts              # Создание таблиц и схемы
├── migrate-from-supabase.ts # Миграция из Supabase
├── fix-issues.ts            # Автоматическое исправление
├── install-postgresql-vm.sh # Установка PostgreSQL на VM
└── quick-start-vm.sh        # Быстрый запуск на VM
```

## 🗄️ Структура базы данных

### Основные таблицы:
- **users** - пользователи Telegram
- **support_chats** - чаты поддержки
- **messages** - сообщения в чатах
- **operators** - операторы поддержки

### Индексы для оптимизации:
- Индексы по user_id, status, operator_id
- Индексы по chat_id, timestamp
- Уникальный индекс по telegram_id

## 🚀 Команды для разработки

### Основные команды:
```bash
# Сборка
npm run build

# Разработка
npm run dev

# Проверка типов
npm run type-check

# Линтинг
npm run lint
npm run lint:fix
```

### Команды для базы данных:
```bash
# Проверка БД
npm run check-db

# Настройка БД
npm run setup-db

# Миграция из Supabase
npm run migrate-from-supabase
```

### Команды для VM:
```bash
# Установка PostgreSQL
./install-postgresql-vm.sh

# Быстрый запуск
./quick-start-vm.sh
```

## 🔐 Конфигурация

### Переменные окружения (.env):
```bash
# База данных (VM)
DB_HOST=158.160.169.147
DB_PORT=5432
DB_NAME=support_db
DB_USER=postgres
DB_PASSWORD=postgres

# CORS
CORS_ORIGIN=http://localhost:3001,http://158.160.169.147:3001

# JWT
JWT_SECRET=dev_jwt_secret_key_here_minimum_32_characters_long
```

### Supabase (для миграции):
```bash
SUPABASE_HOST=your-project.supabase.co
SUPABASE_USER=postgres
SUPABASE_PASSWORD=your-supabase-password
```

## 🧪 Тестирование

### Health Check:
```bash
curl http://localhost:3000/health
```

### API Endpoints:
```bash
# Получение чатов (требует JWT)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:3000/api/chats
```

## 📊 Мониторинг

### Логи:
- Логи приложения: `logs/app.log`
- Логи PostgreSQL: `/var/log/postgresql/` (на VM)

### Метрики:
- Health endpoint: `/health`
- Метрики производительности встроены

## 🚨 Решение проблем

### Ошибка подключения к БД:
1. Проверьте доступность VM: `ping 158.160.169.147`
2. Проверьте статус PostgreSQL на VM
3. Проверьте настройки в .env

### Ошибка CORS:
1. Проверьте CORS_ORIGIN в .env
2. Убедитесь что frontend запущен на правильном порту
3. Перезапустите backend

### Ошибка JWT:
1. Проверьте JWT_SECRET (минимум 32 символа)
2. Перезапустите backend
3. Проверьте токен в браузере

## 🔄 Синхронизация с VM

### После внесения изменений:
```bash
# Локально
git add .
git commit -m "Fix backend issues and migrate to PostgreSQL"
git push origin main

# На VM
git pull origin main
npm install
npm run build
npm run setup-db
npm run start
```

## 📚 Дополнительная документация

- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Детальное устранение неполадок
- [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) - Руководство по миграции
- [POSTGRESQL_SETUP.md](./POSTGRESQL_SETUP.md) - Установка PostgreSQL

## 🎯 Следующие шаги

1. **Установите PostgreSQL на VM** используя `install-postgresql-vm.sh`
2. **Настройте .env** с правильными данными Supabase
3. **Запустите миграцию** через `npm run migrate-from-supabase`
4. **Протестируйте backend** через `npm run dev`
5. **Синхронизируйте с VM** через git

## 💡 Советы

- Всегда используйте `npm run fix-issues` для автоматического исправления
- Проверяйте подключение к БД через `npm run check-db`
- Используйте VM для production, локально для разработки
- Регулярно делайте бэкапы базы данных
- Мониторьте логи на VM для диагностики проблем
