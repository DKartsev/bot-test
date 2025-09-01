#!/usr/bin/env python3
"""
Упрощенная проверка данных в Supabase
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

def main():
    """Основная функция"""
    print("🔍 Упрощенная проверка данных в Supabase")
    print("=" * 50)
    
    try:
        # Подключение к базе данных
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        print("✅ Подключение к Supabase установлено")
        
        # Проверяем основные таблицы
        print("\n📊 Статистика таблиц:")
        
        tables = ['kb_articles', 'kb_chunks', 'conversations', 'messages', 'operators']
        for table in tables:
            try:
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                count = cursor.fetchone()[0]
                print(f"  - {table}: {count} записей")
            except Exception as e:
                print(f"  - {table}: ОШИБКА - {e}")
        
        # Проверяем эмбеддинги
        print("\n🤖 Проверка RAG системы:")
        
        cursor.execute("""
            SELECT 
                COUNT(*) as total_chunks,
                COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as chunks_with_embeddings
            FROM kb_chunks
        """)
        embedding_stats = cursor.fetchone()
        
        total_chunks = embedding_stats[0]
        chunks_with_embeddings = embedding_stats[1]
        coverage_percent = (chunks_with_embeddings * 100.0 / total_chunks) if total_chunks > 0 else 0
        
        print(f"  - Всего чанков: {total_chunks}")
        print(f"  - С эмбеддингами: {chunks_with_embeddings}")
        print(f"  - Покрытие: {coverage_percent:.1f}%")
        
        if coverage_percent == 100:
            print("  ✅ RAG система готова к работе!")
        elif coverage_percent > 80:
            print("  ⚠️  RAG система почти готова")
        else:
            print("  ❌ RAG система требует доработки")
        
        # Проверяем качество чанков
        cursor.execute("""
            SELECT 
                AVG(LENGTH(chunk_text)) as avg_length,
                MIN(LENGTH(chunk_text)) as min_length,
                MAX(LENGTH(chunk_text)) as max_length
            FROM kb_chunks
        """)
        quality_stats = cursor.fetchone()
        
        print(f"\n📝 Качество чанков:")
        print(f"  - Средняя длина: {quality_stats[0]:.0f} символов")
        print(f"  - Диапазон: {quality_stats[1]} - {quality_stats[2]} символов")
        
        # Проверяем размеры таблиц
        cursor.execute("""
            SELECT 
                tablename,
                pg_size_pretty(pg_total_relation_size('public.'||tablename)) as size
            FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename IN ('kb_articles', 'kb_chunks', 'conversations', 'messages')
            ORDER BY pg_total_relation_size('public.'||tablename) DESC
        """)
        sizes = cursor.fetchall()
        
        print(f"\n💾 Размеры таблиц:")
        for table_name, size in sizes:
            print(f"  - {table_name}: {size}")
        
        # Проверяем индексы
        cursor.execute("""
            SELECT COUNT(*) 
            FROM pg_indexes 
            WHERE schemaname = 'public' 
            AND tablename IN ('kb_articles', 'kb_chunks', 'conversations', 'messages')
        """)
        index_count = cursor.fetchone()[0]
        print(f"\n🔍 Индексов: {index_count}")
        
        # Рекомендации
        print(f"\n💡 Рекомендации:")
        
        if coverage_percent < 100:
            print("  - Нужно сгенерировать эмбеддинги для оставшихся чанков")
        
        if quality_stats[1] < 100:
            print("  - Есть короткие чанки, которые могут быть объединены")
        
        if quality_stats[2] > 1000:
            print("  - Есть длинные чанки, которые могут быть разбиты")
        
        if total_chunks > 0:
            print("  - RAG система готова к тестированию")
        
        print(f"\n🎉 Проверка завершена!")
        
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        sys.exit(1)
    finally:
        if 'conn' in locals():
            cursor.close()
            conn.close()
            print("🔌 Соединение с Supabase закрыто")

if __name__ == "__main__":
    main()
