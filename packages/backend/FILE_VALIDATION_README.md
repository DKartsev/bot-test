# 🔒 Система валидации файлов

## Обзор

Система валидации файлов обеспечивает безопасную загрузку файлов с многоуровневой проверкой безопасности, включая:

- ✅ Проверка размера файлов
- ✅ Валидация MIME типов
- ✅ Проверка расширений файлов
- ✅ Блокировка исполняемых файлов
- ✅ Проверка содержимого файлов
- ✅ Обнаружение подозрительных паттернов
- ✅ Защита от скрытых файлов
- ✅ Логирование всех операций

## 🏗️ Архитектура

### 1. FileValidationService (`src/services/fileValidation.ts`)

Основной сервис для валидации файлов с настраиваемыми параметрами:

```typescript
interface FileValidationOptions {
  maxSize?: number;                    // Максимальный размер файла
  allowedMimeTypes?: string[];         // Разрешенные MIME типы
  allowedExtensions?: string[];        // Разрешенные расширения
  scanForViruses?: boolean;            // Сканирование на вирусы (заготовка)
  validateContent?: boolean;           // Проверка содержимого
  maxFileNameLength?: number;          // Максимальная длина имени
  blockExecutableFiles?: boolean;      // Блокировка исполняемых файлов
  allowHiddenFiles?: boolean;          // Разрешение скрытых файлов
}
```

### 2. FileUpload Middleware (`src/middleware/fileUpload.ts`)

Middleware для безопасной загрузки файлов с автоматической валидацией:

- `uploadSingleFile()` - загрузка одного файла
- `uploadMultipleFiles()` - загрузка нескольких файлов
- `uploadFields()` - загрузка файлов с разными полями
- `fileUploadConfigs` - готовые конфигурации для разных типов файлов

### 3. Upload Routes (`src/routes/upload.ts`)

API endpoints для загрузки файлов с различными типами валидации:

- `/upload/image` - загрузка изображений
- `/upload/images` - загрузка нескольких изображений
- `/upload/document` - загрузка документов
- `/upload/archive` - загрузка архивов
- `/upload/media` - загрузка медиа файлов
- `/upload/mixed` - загрузка смешанных типов файлов

## 🚀 Использование

### Базовая загрузка изображения

```typescript
import { fileUploadConfigs } from '../middleware/fileUpload';

router.post('/upload-image', 
  requireOperator, 
  fileUploadConfigs.images('image'),
  async (req, res) => {
    // Файл уже прошел валидацию
    const file = req.file;
    const validation = req.fileValidation; // Результат валидации
    
    // Сохранение файла...
  }
);
```

### Кастомная конфигурация

```typescript
import { uploadSingleFile } from '../middleware/fileUpload';

router.post('/upload-custom', 
  requireOperator,
  uploadSingleFile('file', {
    maxSize: 50 * 1024 * 1024, // 50MB
    allowedMimeTypes: ['application/pdf', 'image/*'],
    allowedExtensions: ['.pdf', '.jpg', '.png'],
    validateContent: true,
    blockExecutableFiles: true,
  }),
  async (req, res) => {
    // Обработка файла...
  }
);
```

### Загрузка нескольких файлов

```typescript
import { uploadMultipleFiles } from '../middleware/fileUpload';

router.post('/upload-multiple', 
  requireOperator,
  uploadMultipleFiles('files', {
    maxSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5,
    allowedMimeTypes: ['image/*'],
  }),
  async (req, res) => {
    const files = req.files; // Array of files
    const validations = req.fileValidation; // Array of validation results
  }
);
```

## 🔧 Конфигурация

### Переменные окружения

```env
# Максимальный размер файла (в байтах)
MAX_FILE_SIZE=10485760

# Директория для загрузок
UPLOAD_DIR=uploads
```

### Готовые конфигурации

```typescript
export const fileUploadConfigs = {
  // Изображения (5MB, JPEG, PNG, GIF, WebP)
  images: (fieldName: string = 'image') => uploadSingleFile(fieldName, {
    maxSize: 5 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    validateContent: true,
    blockExecutableFiles: true,
  }),

  // Документы (10MB, PDF, DOC, DOCX, TXT)
  documents: (fieldName: string = 'document') => uploadSingleFile(fieldName, {
    maxSize: 10 * 1024 * 1024,
    allowedMimeTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
    allowedExtensions: ['.pdf', '.doc', '.docx', '.txt'],
    validateContent: true,
    blockExecutableFiles: true,
  }),

  // Архивы (50MB, ZIP, RAR, 7Z)
  archives: (fieldName: string = 'archive') => uploadSingleFile(fieldName, {
    maxSize: 50 * 1024 * 1024,
    allowedMimeTypes: ['application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed'],
    allowedExtensions: ['.zip', '.rar', '.7z'],
    validateContent: false,
    blockExecutableFiles: true,
  }),

  // Медиа файлы (100MB, MP3, WAV, MP4, WebM)
  media: (fieldName: string = 'media') => uploadSingleFile(fieldName, {
    maxSize: 100 * 1024 * 1024,
    allowedMimeTypes: ['audio/mpeg', 'audio/wav', 'video/mp4', 'video/webm'],
    allowedExtensions: ['.mp3', '.wav', '.mp4', '.webm'],
    validateContent: false,
    blockExecutableFiles: true,
  }),
};
```

## 🛡️ Безопасность

### Блокируемые типы файлов

- **Исполняемые файлы**: `.exe`, `.bat`, `.cmd`, `.com`, `.scr`, `.pif`, `.vbs`, `.js`, `.jar`
- **Скрытые файлы**: файлы, начинающиеся с `.` или содержащие `~`
- **Подозрительные имена**: файлы с ключевыми словами `virus`, `malware`, `trojan`, `backdoor`, `exploit`

### Проверка содержимого

- **PDF файлы**: проверка сигнатуры `%PDF`
- **Изображения**: проверка сигнатур JPEG, PNG, GIF, WebP
- **Текстовые файлы**: ограничение размера до 1MB
- **Архивы**: базовая проверка без анализа содержимого

### Валидация имен файлов

- Максимальная длина: 255 символов
- Запрещенные символы: `< > : " / \ | ? *`
- Запрещены точки в начале и конце имени
- Проверка на двойные расширения

## 📊 Логирование и мониторинг

### Логи операций

```typescript
// Успешная загрузка
logInfo('Файл успешно загружен и прошел валидацию', {
  fileName: 'document.pdf',
  size: 1024000,
  mimeType: 'application/pdf',
});

// Предупреждения
logWarning('Файл загружен с предупреждениями', {
  fileName: 'image.jpg',
  warnings: ['Файл слишком маленький для изображения'],
});

// Ошибки валидации
logWarning('Файл не прошел валидацию', {
  fileName: 'script.exe',
  errors: ['Исполняемые файлы запрещены к загрузке'],
  warnings: [],
});
```

### Статистика валидации

```typescript
// GET /upload/validation-stats
{
  "success": true,
  "data": {
    "maxFileSize": "10 MB",
    "allowedMimeTypes": ["image/*", "application/pdf", "text/*"],
    "allowedExtensions": [".jpg", ".png", ".pdf", ".txt"],
    "securityFeatures": {
      "blockExecutableFiles": true,
      "allowHiddenFiles": false,
      "validateContent": true,
      "scanForViruses": false
    }
  }
}
```

## 🔄 Интеграция с существующим кодом

### Обновление AttachmentService

```typescript
// Старый метод
async saveFile(file: { size: number; mimetype: string; originalname: string; path: string }, chatId: number): Promise<Attachment>

// Новый метод
async saveFile(file: Express.Multer.File, chatId: number): Promise<Attachment>
```

### Использование в роутах

```typescript
// Старый подход
router.post('/upload', upload.single('file'), async (req, res) => {
  // Ручная валидация
  const validation = await attachmentService.validateFile(req.file);
  if (!validation.isValid) {
    return res.status(400).json({ error: 'Файл не прошел валидацию' });
  }
  // Сохранение...
});

// Новый подход
router.post('/upload', fileUploadConfigs.documents('file'), async (req, res) => {
  // Файл уже прошел валидацию
  const attachment = await attachmentService.saveFile(req.file, chatId);
  // Готово!
});
```

## 🧪 Тестирование

### Примеры тестовых файлов

- **Валидные**: `document.pdf`, `image.jpg`, `archive.zip`
- **Невалидные**: `script.exe`, `.hidden`, `virus.bat`
- **С предупреждениями**: `tiny.jpg` (менее 100 байт), `large.txt` (более 1MB)

### Тестирование API

```bash
# Загрузка изображения
curl -X POST http://localhost:3000/upload/image \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@test.jpg" \
  -F "chat_id=123"

# Загрузка документа
curl -X POST http://localhost:3000/upload/document \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "document=@document.pdf" \
  -F "chat_id=123"

# Получение статистики
curl -X GET http://localhost:3000/upload/validation-stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🚨 Обработка ошибок

### Типы ошибок

```typescript
// Ошибки загрузки
{
  "error": "Файл слишком большой",
  "details": [{
    "field": "image",
    "message": "Размер файла превышает максимально допустимый",
    "code": "file_too_large"
  }]
}

// Ошибки валидации
{
  "error": "Файл не прошел валидацию",
  "details": [{
    "field": "file",
    "message": "Исполняемые файлы запрещены к загрузке",
    "code": "validation_error"
  }],
  "warnings": ["Обнаружены подозрительные паттерны: двойное расширение"]
}
```

### Коды ошибок

- `file_too_large` - файл превышает максимальный размер
- `too_many_files` - превышен лимит количества файлов
- `upload_error` - общая ошибка загрузки
- `validation_error` - ошибка валидации
- `missing_file` - файл не предоставлен

## 🔮 Планы развития

### Краткосрочные улучшения

- [ ] Добавить проверку хешей файлов для предотвращения дублирования
- [ ] Реализовать асинхронную валидацию больших файлов
- [ ] Добавить поддержку прогресс-бара для загрузки

### Долгосрочные улучшения

- [ ] Интеграция с антивирусными движками
- [ ] Машинное обучение для обнаружения подозрительных файлов
- [ ] Автоматическая классификация файлов по содержимому
- [ ] Интеграция с облачными сервисами валидации

## 📚 Дополнительные ресурсы

- [Multer документация](https://github.com/expressjs/multer)
- [Express File Upload](https://expressjs.com/en/resources/middleware/multer.html)
- [File Type Detection](https://github.com/sindresorhus/file-type)
- [Security Best Practices](https://owasp.org/www-project-top-ten/)
