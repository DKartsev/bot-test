-- Создаем функцию для выполнения произвольного SQL
-- Это нужно для миграций через Supabase RPC

CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result text;
BEGIN
  EXECUTE sql;
  RETURN 'OK';
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'ERROR: ' || SQLERRM;
END;
$$;

-- Даем права на выполнение
GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO service_role;
