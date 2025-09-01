#!/usr/bin/env python3
"""
Скрипт для оптимизации и проверки данных в Supabase
"""

import psycopg2
import sys
from datetime import datetime

# Конфигурация базы данных Supabase
DB_CONFIG = {
    'host': 'aws-0-eu-north-1.pooler.supabase.com',
    'port': 5432,
    'database': 'postgres',
    'user': 'postgres.ymfduihrjjuzwuckbjjh',
    'password': 'mn4c0Je402fgh3mc5'
}

def check_database_health(cursor) -> dict:
    """Проверяет здоровье базы данных"""
    health = {}
    
    # Проверяем основные таблицы
    tables = ['kb_articles', 'kb_chunks', 'conversations', 'messages', 'operators']
    for table in tables:
        try:
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            count = cursor.fetchone()[0]
            health[table] = count
        except Exception as e:
            health[table] = f"ERROR: {e}"
    
    # Проверяем индексы
    cursor.execute("""
        SELECT indexname, tablename 
        FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename IN ('kb_articles', 'kb_chunks', 'conversations', 'messages')
        ORDER BY tablename, indexname
    """)
    indexes = cursor.fetchall()
    health['indexes'] = len(indexes)
    
    # Проверяем размеры таблиц
    cursor.execute("""
        SELECT 
            schemaname,
            tablename,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN ('kb_articles', 'kb_chunks', 'conversations', 'messages')
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    """)
    sizes = cursor.fetchall()
    health['table_sizes'] = sizes
    
    return health

def analyze_kb_data(cursor) -> dict:
    """Анализирует данные базы знаний"""
    analysis = {}
    
    # Статистика статей
    cursor.execute("""
        SELECT 
            COUNT(*) as total_articles,
            COUNT(CASE WHEN tags IS NOT NULL THEN 1 END) as articles_with_tags,
            COUNT(CASE WHEN body_md IS NOT NULL AND LENGTH(body_md) > 0 THEN 1 END) as articles_with_content
        FROM kb_articles
    """)
    article_stats = cursor.fetchone()
    analysis['articles'] = {
        'total': article_stats[0],
        'with_tags': article_stats[1],
        'with_content': article_stats[2]
    }
    
    # Статистика чанков
    cursor.execute("""
        SELECT 
            COUNT(*) as total_chunks,
            COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as chunks_with_embeddings,
            AVG(LENGTH(chunk_text)) as avg_chunk_length,
            MIN(LENGTH(chunk_text)) as min_chunk_length,
            MAX(LENGTH(chunk_text)) as max_chunk_length
        FROM kb_chunks
    """)
    chunk_stats = cursor.fetchone()
    analysis['chunks'] = {
        'total': chunk_stats[0],
        'with_embeddings': chunk_stats[1],
        'avg_length': round(chunk_stats[2] or 0, 2),
        'min_length': chunk_stats[3] or 0,
        'max_length': chunk_stats[4] or 0
    }
    
    # Топ тегов (исправленная версия)
    try:
        cursor.execute("""
            SELECT tags, COUNT(*) as count
            FROM kb_articles 
            WHERE tags IS NOT NULL AND tags != '[]' AND tags != 'null'
            GROUP BY tags 
            ORDER BY count DESC 
            LIMIT 10
        """)
        top_tags = cursor.fetchall()
        analysis['top_tags'] = top_tags
    except Exception as e:
        print(f"    ⚠️  Ошибка анализа тегов: {e}")
        analysis['top_tags'] = []
    
    return analysis

def check_rag_readiness(cursor) -> dict:
    """Проверяет готовность RAG системы"""
    readiness = {}
    
    # Проверяем наличие эмбеддингов
    cursor.execute("""
        SELECT 
            COUNT(*) as total_chunks,
            COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as chunks_with_embeddings,
            ROUND(
                COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) * 100.0 / COUNT(*), 
                2
            ) as embedding_coverage_percent
        FROM kb_chunks
    """)
    embedding_stats = cursor.fetchone()
    readiness['embeddings'] = {
        'total_chunks': embedding_stats[0],
        'with_embeddings': embedding_stats[1],
        'coverage_percent': embedding_stats[2]
    }
    
    # Проверяем качество чанков
    cursor.execute("""
        SELECT 
            COUNT(*) as total_chunks,
            COUNT(CASE WHEN LENGTH(chunk_text) > 100 THEN 1 END) as good_length_chunks,
            COUNT(CASE WHEN LENGTH(chunk_text) > 500 THEN 1 END) as long_chunks,
            COUNT(CASE WHEN LENGTH(chunk_text) < 50 THEN 1 END) as short_chunks
        FROM kb_chunks
    """)
    quality_stats = cursor.fetchone()
    readiness['chunk_quality'] = {
        'total': quality_stats[0],
        'good_length': quality_stats[1],
        'long': quality_stats[2],
        'short': quality_stats[3]
    }
    
    return readiness

def main():
    """Основная функция"""
    print("🔍 Анализ и оптимизация данных в Supabase")
    print("=" * 50)
    
    try:
        # Подключение к базе данных
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        print("✅ Подключение к Supabase установлено")
        
        # 1. Проверка здоровья базы данных
        print("\n📊 Проверка здоровья базы данных...")
        health = check_database_health(cursor)
        
        print("  Таблицы:")
        for table, count in health.items():
            if isinstance(count, int):
                print(f"    - {table}: {count} записей")
        
        print(f"  Индексов: {health['indexes']}")
        
        print("  Размеры таблиц:")
        for size_info in health['table_sizes']:
            print(f"    - {size_info[1]}: {size_info[2]}")
        
        # 2. Анализ данных базы знаний
        print("\n📚 Анализ базы знаний...")
        kb_analysis = analyze_kb_data(cursor)
        
        print(f"  Статьи:")
        print(f"    - Всего: {kb_analysis['articles']['total']}")
        print(f"    - С тегами: {kb_analysis['articles']['with_tags']}")
        print(f"    - С контентом: {kb_analysis['articles']['with_content']}")
        
        print(f"  Чанки:")
        print(f"    - Всего: {kb_analysis['chunks']['total']}")
        print(f"    - С эмбеддингами: {kb_analysis['chunks']['with_embeddings']}")
        print(f"    - Средняя длина: {kb_analysis['chunks']['avg_length']} символов")
        print(f"    - Диапазон: {kb_analysis['chunks']['min_length']} - {kb_analysis['chunks']['max_length']} символов")
        
        # 3. Проверка готовности RAG
        print("\n🤖 Проверка готовности RAG системы...")
        rag_readiness = check_rag_readiness(cursor)
        
        coverage = rag_readiness['embeddings']['coverage_percent']
        print(f"  Покрытие эмбеддингами: {coverage}%")
        
        if coverage == 100:
            print("  ✅ RAG система готова к работе!")
        elif coverage > 80:
            print("  ⚠️  RAG система почти готова")
        else:
            print("  ❌ RAG система требует доработки")
        
        quality = rag_readiness['chunk_quality']
        print(f"  Качество чанков:")
        print(f"    - Хорошей длины (>100 символов): {quality['good_length']}")
        print(f"    - Длинные (>500 символов): {quality['long']}")
        print(f"    - Короткие (<50 символов): {quality['short']}")
        
        # 4. Рекомендации
        print("\n💡 Рекомендации:")
        
        if coverage < 100:
            print("  - Нужно сгенерировать эмбеддинги для оставшихся чанков")
        
        if quality['short'] > 0:
            print("  - Есть короткие чанки, которые могут быть объединены")
        
        if quality['long'] > 0:
            print("  - Есть длинные чанки, которые могут быть разбиты")
        
        if kb_analysis['articles']['with_tags'] < kb_analysis['articles']['total']:
            print("  - Некоторые статьи не имеют тегов")
        
        print(f"\n🎉 Анализ завершен!")
        
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
