# Инструкция по загрузке данных в RAG пайплайн

## Текущий статус

✅ **Функция `match_kb_chunks` создана и работает**  
❌ **В базе данных нет данных с embeddings**  
❌ **Anon key не имеет прав на запись в таблицы**

## Варианты загрузки данных

### Вариант 1: Через Supabase Dashboard (Рекомендуется)

1. **Откройте Supabase Dashboard** → ваш проект → Table Editor
2. **Добавьте статью в таблицу `kb_articles`**:
   ```sql
   INSERT INTO kb_articles (title, slug, body_md, tags) VALUES 
   ('Как пополнить баланс', 'how-to-top-up-balance', 
   '# Как пополнить баланс\n\nСуществует несколько способов пополнить баланс...', 
   ARRAY['тест', 'документация']);
   ```

3. **Создайте embeddings через SQL** (используйте OpenAI API):
   ```sql
   -- Сначала создайте чанки без embeddings
   INSERT INTO kb_chunks (article_id, chunk_text, chunk_index) 
   SELECT id, 'Как пополнить баланс. Существует несколько способов пополнить баланс вашего аккаунта.', 0 
   FROM kb_articles WHERE slug = 'how-to-top-up-balance';
   ```

4. **Обновите embeddings через API** (используйте service role key)

### Вариант 2: Настройка Service Role Key

1. **Получите Service Role Key** в Supabase Dashboard → Settings → API
2. **Добавьте в .env файл**:
   ```env
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```

3. **Запустите скрипт загрузки**:
   ```bash
   node load-test-data.js
   ```

### Вариант 3: Ручное добавление через SQL

Выполните в Supabase SQL Editor:

```sql
-- 1. Добавляем тестовую статью
INSERT INTO kb_articles (title, slug, body_md, tags) VALUES 
('Как пополнить баланс', 'how-to-top-up-balance', 
'# Как пополнить баланс

Существует несколько способов пополнить баланс вашего аккаунта:

## Банковская карта
1. Перейдите в раздел "Пополнение"
2. Выберите "Банковская карта"
3. Введите сумму пополнения
4. Введите данные карты
5. Подтвердите операцию

## Электронные кошельки
- **Qiwi**: используйте номер телефона
- **WebMoney**: используйте WMID
- **Яндекс.Деньги**: используйте номер кошелька

Если у вас возникли проблемы с пополнением, обратитесь в службу поддержки.', 
ARRAY['тест', 'документация']);

-- 2. Добавляем чанки (без embeddings для начала)
INSERT INTO kb_chunks (article_id, chunk_text, chunk_index) 
SELECT id, 'Как пополнить баланс. Существует несколько способов пополнить баланс вашего аккаунта: Банковская карта, Электронные кошельки, Банковский перевод.', 0 
FROM kb_articles WHERE slug = 'how-to-top-up-balance';

INSERT INTO kb_chunks (article_id, chunk_text, chunk_index) 
SELECT id, 'Банковская карта: Перейдите в раздел "Пополнение", Выберите "Банковская карта", Введите сумму пополнения, Введите данные карты, Подтвердите операцию.', 1 
FROM kb_articles WHERE slug = 'how-to-top-up-balance';

INSERT INTO kb_chunks (article_id, chunk_text, chunk_index) 
SELECT id, 'Электронные кошельки: Qiwi - используйте номер телефона, WebMoney - используйте WMID, Яндекс.Деньги - используйте номер кошелька.', 2 
FROM kb_articles WHERE slug = 'how-to-top-up-balance';
```

### Вариант 4: Создание embeddings через API

После добавления чанков без embeddings, создайте embeddings через OpenAI API:

```javascript
// Пример скрипта для создания embeddings
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function createEmbeddings() {
  // Получаем чанки без embeddings
  const { data: chunks } = await supabase
    .from('kb_chunks')
    .select('*')
    .is('embedding', null);

  for (const chunk of chunks) {
    // Создаем embedding через OpenAI API
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: chunk.chunk_text,
      }),
    });

    const data = await response.json();
    const embedding = data.data[0].embedding;

    // Обновляем чанк с embedding
    await supabase
      .from('kb_chunks')
      .update({ embedding })
      .eq('id', chunk.id);
  }
}
```

## Проверка загрузки данных

После загрузки данных выполните:

```bash
node test-function-direct.js
```

Должно показать результаты поиска вместо "Найдено результатов: 0".

## Следующие шаги

1. **Загрузите данные** любым из предложенных способов
2. **Протестируйте функцию**: `node test-function-direct.js`
3. **Запустите сервер**: `npm run dev`
4. **Протестируйте RAG пайплайн**:
   ```bash
   curl -X POST http://localhost:3000/api/supabase-rag/test \
     -H "Content-Type: application/json" \
     -d '{"testQuery": "Как пополнить баланс?"}'
   ```

## Troubleshooting

### Проблема: "permission denied for table"
**Решение**: Используйте Service Role Key вместо anon key для записи данных

### Проблема: "No data found"
**Решение**: Убедитесь, что в таблице `kb_chunks` есть записи с embeddings

### Проблема: "Function returns 0 results"
**Решение**: Проверьте, что embeddings созданы правильно и имеют размерность 1536
