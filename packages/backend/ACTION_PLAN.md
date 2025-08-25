# 🎯 План действий для завершения миграции

## ✅ Что уже сделано:

1. **Исправлены основные проблемы backend:**
   - Создан правильный файл `.env`
   - Исправлены ошибки CORS
   - Обновлен ChatRepository для работы с отсутствующими таблицами
   - Исправлена проблема с кодировкой Windows

2. **Подготовлена миграция на PostgreSQL:**
   - Созданы скрипты для установки PostgreSQL на VM
   - Создан скрипт миграции данных из Supabase
   - Подготовлена документация по миграции

3. **Созданы все необходимые скрипты:**
   - `fix-issues.ts` - автоматическое исправление проблем
   - `check-db.ts` - проверка подключения к БД
   - `setup-db.ts` - создание таблиц и схемы
   - `migrate-from-supabase.ts` - миграция данных
   - `install-postgresql-vm.sh` - установка PostgreSQL на VM
   - `quick-start-vm.sh` - быстрый запуск на VM
   - `copy-to-vm.ps1` - копирование файлов на VM

## 🚀 Следующие шаги:

### Этап 1: Установка PostgreSQL на VM (ВЫПОЛНИТЬ СЕЙЧАС)

1. **Подключитесь к VM:**
```bash
ssh -l dankartsev 158.160.169.147
```

2. **Скопируйте скрипт установки:**
```bash
# Локально
scp packages/backend/scripts/install-postgresql-vm.sh dankartsev@158.160.169.147:~/
```

3. **Выполните установку на VM:**
```bash
# На VM
chmod +x install-postgresql-vm.sh
./install-postgresql-vm.sh
```

### Этап 2: Настройка .env для миграции

1. **Обновите .env с данными Supabase:**
```bash
# Замените placeholder значения на реальные
SUPABASE_HOST=your-actual-project.supabase.co
SUPABASE_USER=your-actual-username
SUPABASE_PASSWORD=your-actual-password
```

### Этап 3: Миграция данных

1. **Запустите миграцию:**
```bash
npm run migrate-from-supabase
```

2. **Проверьте результат:**
```bash
npm run check-db
```

### Этап 4: Копирование на VM

1. **Используйте PowerShell скрипт:**
```bash
# В PowerShell
.\scripts\copy-to-vm.ps1
```

2. **Или выполните вручную:**
```bash
# Создайте архив
tar -czf backend-files.tar.gz --exclude=node_modules --exclude=dist --exclude=logs --exclude=uploads --exclude=.git .

# Скопируйте на VM
scp backend-files.tar.gz dankartsev@158.160.169.147:~/

# На VM распакуйте и настройте
ssh dankartsev@158.160.169.147
cd /home/dankartsev/bot-test
tar -xzf ~/backend-files.tar.gz
npm install
npm run build
npm run setup-db
```

### Этап 5: Запуск на VM

1. **Запустите backend:**
```bash
# На VM
npm run start
```

2. **Проверьте работу:**
```bash
# Локально
curl http://158.160.169.147:3000/health
```

## 🔧 Команды для проверки:

### Локально:
```bash
# Проверка исправлений
npm run fix-issues

# Проверка подключения к БД
npm run check-db

# Запуск backend
npm run dev
```

### На VM:
```bash
# Проверка PostgreSQL
sudo systemctl status postgresql

# Проверка подключения к БД
psql -h localhost -U postgres -d support_db

# Проверка backend
curl http://localhost:3000/health
```

## 📋 Чек-лист завершения:

- [ ] PostgreSQL установлен на VM
- [ ] База данных support_db создана
- [ ] .env настроен с данными Supabase
- [ ] Миграция данных выполнена успешно
- [ ] Файлы скопированы на VM
- [ ] Backend запущен на VM
- [ ] API endpoints работают корректно
- [ ] Frontend может подключиться к backend

## 🚨 Возможные проблемы и решения:

### Проблема: Ошибка подключения к VM
**Решение**: Проверьте доступность `ping 158.160.169.147`

### Проблема: PostgreSQL не запускается
**Решение**: На VM выполните `sudo systemctl start postgresql`

### Проблема: Ошибка миграции
**Решение**: Проверьте настройки Supabase в .env

### Проблема: CORS ошибки
**Решение**: Убедитесь что CORS_ORIGIN настроен правильно

## 🎉 Ожидаемый результат:

После выполнения всех этапов у вас будет:
- ✅ Работающий backend на VM
- ✅ Локальная база данных PostgreSQL
- ✅ Мигрированные данные из Supabase
- ✅ Полный контроль над данными
- ✅ Быстрая работа системы

## 📞 Поддержка:

Если возникнут проблемы:
1. Проверьте логи: `logs/app.log`
2. Проверьте статус PostgreSQL на VM
3. Используйте `npm run check-db` для диагностики
4. Обратитесь к документации в папке docs/
