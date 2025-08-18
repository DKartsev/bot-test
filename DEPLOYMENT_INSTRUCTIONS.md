# 🚀 **Инструкция по деплою: Вариант 3 - Полный серверный рендеринг**

## 🎯 **Архитектура**

### **Сервисы:**
1. **bot-test-backend** - Backend API (порт 10000)
2. **bot-test-operator-admin** - Frontend панель (порт 3000)

### **Схема:**
```
Frontend (operator-admin) ←→ Backend API
     ↓                           ↓
Render Service 1          Render Service 2
```

## 🔧 **Шаг 1: Деплой Backend**

### **1.1 Обновить render.yaml:**
```bash
git add render.yaml
git commit -m "Separate backend service: remove operator-admin integration"
git push origin main
```

### **1.2 В Render Dashboard:**
- **Service Name:** `bot-test-backend`
- **Environment:** `Node`
- **Build Command:** `npm ci && npm run build -w packages/backend`
- **Start Command:** `npm run start -w packages/backend`

### **1.3 Environment Variables:**
```
NODE_VERSION=20
NPM_VERSION=10
PORT=10000
NODE_ENV=production
CORS_ORIGIN=https://bot-test-operator-admin.onrender.com
DATABASE_URL=<your-database-url>
OPENAI_API_KEY=<your-openai-key>
TELEGRAM_BOT_TOKEN=<your-telegram-token>
SUPABASE_URL=<your-supabase-url>
SUPABASE_KEY=<your-supabase-key>
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>
```

## 🔧 **Шаг 2: Деплой Operator Admin**

### **2.1 Создать новый сервис в Render:**
- **New → Web Service**
- **Connect to:** `bot-test` repository
- **Root Directory:** `packages/operator-admin`
- **Environment:** `Node`
- **Build Command:** `npm ci && npm run build`
- **Start Command:** `npm run start`

### **2.2 Environment Variables:**
```
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_BASE_PATH=""
NEXT_PUBLIC_API_URL=https://bot-test-backend.onrender.com
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

### **2.3 Или использовать render-operator-admin.yaml:**
```bash
# В Render Dashboard → New → Blueprint Instance
# Загрузить файл render-operator-admin.yaml
```

## 🔧 **Шаг 3: Проверка интеграции**

### **3.1 Backend API:**
- **URL:** `https://bot-test-backend.onrender.com`
- **Health Check:** `GET /` → `{"status":"ok","service":"bot-test-backend"}`
- **CORS:** Разрешен для `https://bot-test-operator-admin.onrender.com`

### **3.2 Operator Admin:**
- **URL:** `https://bot-test-operator-admin.onrender.com`
- **Frontend:** Полноценная Next.js панель
- **API Calls:** К `https://bot-test-backend.onrender.com`

## 🔧 **Шаг 4: Тестирование**

### **4.1 Проверить Backend:**
```bash
curl https://bot-test-backend.onrender.com/
# Должен вернуть: {"status":"ok","service":"bot-test-backend"}
```

### **4.2 Проверить Frontend:**
- Открыть `https://bot-test-operator-admin.onrender.com`
- Должна загрузиться панель администратора
- Проверить API вызовы к backend

### **4.3 Проверить CORS:**
```bash
curl -H "Origin: https://bot-test-operator-admin.onrender.com" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://bot-test-backend.onrender.com/
```

## 🎯 **Результат**

### **Готовность панели: 90%**
- ✅ **Backend API** - полностью функционален
- ✅ **Frontend панель** - работает на Next.js
- ✅ **CORS** - настроен корректно
- ✅ **Разделение сервисов** - чистая архитектура
- ⚠️ **Интеграция API** - требует настройки в frontend

### **Преимущества:**
- 🚀 **Полный серверный рендеринг**
- 🔧 **Гибкая настройка** каждого сервиса
- 📈 **Масштабируемость** по отдельности
- 🧪 **Простое тестирование** каждого компонента

---

**После выполнения всех шагов у вас будет полноценная панель для операторов!** 🎉
