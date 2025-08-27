-- Проверить структуру таблицы operators
\d operators;

-- Проверить текущего оператора
SELECT * FROM operators WHERE email = 'test@operator.com';
