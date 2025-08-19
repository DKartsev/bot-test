# Исправления для проблемы с деплоем

## Проблема
Деплой на Render падал с ошибкой:
```
sh: 1: husky: not found
npm error code 127
```

## Причина
Скрипт `prepare` в корневом package.json пытался выполнить `husky install`, но `husky` был установлен только как devDependency.

## Внесенные исправления

### 1. Корневой package.json
- Изменен скрипт `prepare` для проверки окружения
- Добавлен скрипт `build:prod` для production сборки
- Добавлен скрипт `postinstall` для логирования

### 2. render.yaml (Backend)
- Убран флаг `--include=dev` из `npm ci`
- Изменена команда сборки на `npm run build:prod`
- Добавлена переменная `NPM_CONFIG_PRODUCTION=true`

### 3. render-operator-admin.yaml
- Убран флаг `--include=dev` из `npm ci`
- Добавлена переменная `NPM_CONFIG_PRODUCTION=true`
- Добавлен `NODE_ENV=production` в команду сборки

### 4. packages/backend/package.json
- Перемещены `rimraf`, `tsc-alias`, `tsx`, `typescript` в dependencies
- Эти пакеты нужны для production сборки

### 5. packages/operator-admin/package.json
- Добавлен `rimraf` в dependencies
- Исправлен скрипт `clean` для использования `rimraf`

### 6. .npmrc
- Добавлены настройки для отключения prepare скриптов в production

## Результат
Теперь деплой должен проходить успешно, так как:
- husky не будет установлен в production
- Все необходимые зависимости для сборки находятся в dependencies
- Переменные окружения правильно настроены

## Тестирование
После внесения изменений:
1. Закоммитьте изменения
2. Запушьте в GitHub
3. Проверьте логи деплоя на Render
4. Убедитесь, что нет ошибок с husky
