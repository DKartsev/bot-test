#!/usr/bin/env python3
"""
Скрипт для проверки таблиц в Supabase
"""

import psycopg2
import sys

# Конфигурация базы данных Supabase
DB_CONFIG = {
    'host': 'aws-0-eu-north-1.pooler.supabase.com',
    'port': 5432,
    'database': 'postgres',
    'user': 'postgres.ymfduihrjjuzwuckbjjh',
    'password': 'mn4c0Je402fgh3mc5'
}

def check_tables():
    """Проверяет таблицы в Supabase"""
    try:
        # Подключение к базе данных
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        print("✅ Подключение к Supabase установлено")
        
        # Получаем список таблиц
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        """)
        tables = cursor.fetchall()
        
        print(f"\n📊 Найдено {len(tables)} таблиц в Supabase:")
        for table in tables:
            print(f"  - {table[0]}")
        
        # Проверяем схему support
        cursor.execute("""
            SELECT schema_name 
            FROM information_schema.schemata 
            WHERE schema_name = 'support'
        """)
        support_schema = cursor.fetchone()
        
        if support_schema:
            print(f"\n📋 Схема 'support' найдена")
            cursor.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'support' 
                ORDER BY table_name
            """)
            support_tables = cursor.fetchall()
            print(f"  Таблиц в схеме support: {len(support_tables)}")
            for table in support_tables:
                print(f"    - {table[0]}")
        else:
            print(f"\n❌ Схема 'support' не найдена")
        
        # Проверяем расширения
        cursor.execute("""
            SELECT extname 
            FROM pg_extension 
            ORDER BY extname
        """)
        extensions = cursor.fetchall()
        print(f"\n🔧 Установленные расширения:")
        for ext in extensions:
            print(f"  - {ext[0]}")
        
        # Проверяем pgvector
        cursor.execute("""
            SELECT extname 
            FROM pg_extension 
            WHERE extname = 'vector'
        """)
        vector_ext = cursor.fetchone()
        if vector_ext:
            print(f"  ✅ pgvector установлен")
        else:
            print(f"  ❌ pgvector НЕ установлен")
        
        conn.close()
        print(f"\n🔌 Соединение с Supabase закрыто")
        
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        sys.exit(1)

if __name__ == "__main__":
    check_tables()
