-- Проверяем ограничения таблицы conversations
SELECT 
    conname as constraint_name,
    consrc as constraint_definition
FROM pg_constraint 
WHERE conrelid = (SELECT oid FROM pg_class WHERE relname = 'conversations')
    AND contype = 'c';

-- Также проверяем структуру таблицы
\d+ conversations
