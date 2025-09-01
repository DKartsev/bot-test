#!/usr/bin/env python3
"""
Скрипт для проверки тегов в статьях
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

def check_tags():
    """Проверяет теги в статьях"""
    try:
        # Подключение к базе данных
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        print("✅ Подключение к Supabase установлено")
        
        # Получаем примеры статей
        cursor.execute("SELECT id, title, tags FROM kb_articles LIMIT 5")
        articles = cursor.fetchall()
        
        print(f"\n📊 Примеры статей:")
        for article in articles:
            article_id, title, tags = article
            print(f"  ID: {article_id}")
            print(f"  Title: {title}")
            print(f"  Tags: {repr(tags)}")
            print(f"  Tags type: {type(tags)}")
            print()
        
        # Проверяем количество статей с разными типами тегов
        cursor.execute("SELECT COUNT(*) FROM kb_articles WHERE tags IS NULL")
        null_tags = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM kb_articles WHERE tags = '[]'")
        empty_array = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM kb_articles WHERE tags = 'null'")
        null_string = cursor.fetchone()[0]
        
        print(f"📊 Статистика тегов:")
        print(f"  - NULL теги: {null_tags}")
        print(f"  - Пустые массивы '[]': {empty_array}")
        print(f"  - Строка 'null': {null_string}")
        
        conn.close()
        print("🔌 Соединение с Supabase закрыто")
        
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        sys.exit(1)

if __name__ == "__main__":
    check_tags()
