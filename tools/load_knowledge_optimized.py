#!/usr/bin/env python3
"""
Оптимизированный скрипт для загрузки знаний в Supabase
"""

import os
import sys
import psycopg2
import uuid
from datetime import datetime
from pathlib import Path
import re
import json

# Конфигурация базы данных Supabase
DB_CONFIG = {
    'host': 'aws-0-eu-north-1.pooler.supabase.com',
    'port': 5432,
    'database': 'postgres',
    'user': 'postgres.ymfduihrjjuzwuckbjjh',
    'password': 'mn4c0Je402fgh3mc5'
}

def parse_markdown_file(file_path: Path) -> dict:
    """Парсит markdown файл и извлекает метаданные и содержимое"""
    content = file_path.read_text(encoding='utf-8')
    
    # Извлекаем frontmatter (между ---)
    frontmatter_match = re.match(r'^---\n(.*?)\n---\n', content, re.DOTALL)
    
    if frontmatter_match:
        frontmatter_text = frontmatter_match.group(1)
        # Простой парсинг YAML
        metadata = {}
        for line in frontmatter_text.split('\n'):
            if ':' in line:
                key, value = line.split(':', 1)
                key = key.strip()
                value = value.strip().strip('"')
                if key == 'tags':
                    # Парсим теги
                    tags_text = value.strip('[]')
                    tags = [tag.strip().strip('"') for tag in tags_text.split(',') if tag.strip()]
                    metadata[key] = tags
                else:
                    metadata[key] = value
        
        # Убираем frontmatter из содержимого
        body_md = content[frontmatter_match.end():].strip()
    else:
        # Если нет frontmatter, используем имя файла
        metadata = {
            'title': file_path.stem.replace('-', ' ').title(),
            'slug': file_path.stem,
            'tags': []
        }
        body_md = content
    
    return {
        'title': metadata.get('title', file_path.stem.replace('-', ' ').title()),
        'slug': metadata.get('slug', file_path.stem),
        'tags': metadata.get('tags', []),
        'body_md': body_md
    }

def create_kb_article(cursor, article_data: dict) -> str:
    """Создает статью в базе знаний"""
    article_id = str(uuid.uuid4())
    
    cursor.execute("""
        INSERT INTO kb_articles (id, title, slug, body_md, tags, updated_at)
        VALUES (%s, %s, %s, %s, %s, %s)
        ON CONFLICT (slug) DO UPDATE SET
            title = EXCLUDED.title,
            body_md = EXCLUDED.body_md,
            tags = EXCLUDED.tags,
            updated_at = EXCLUDED.updated_at
        RETURNING id
    """, (
        article_id,
        article_data['title'],
        article_data['slug'],
        article_data['body_md'],
        json.dumps(article_data['tags']),  # Сохраняем как JSON
        datetime.now()
    ))
    
    return cursor.fetchone()[0]

def create_chunks_from_article(cursor, article_id: str, article_data: dict):
    """Создает чанки из статьи для RAG системы"""
    content = article_data['body_md']
    
    # Простое разбиение на чанки по параграфам
    paragraphs = content.split('\n\n')
    chunks = []
    
    for i, paragraph in enumerate(paragraphs):
        if paragraph.strip():
            chunk_text = paragraph.strip()
            if len(chunk_text) > 50:  # Минимальная длина чанка
                chunks.append({
                    'text': chunk_text,
                    'index': i
                })
    
    # Вставляем чанки
    for chunk in chunks:
        chunk_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO kb_chunks (id, article_id, chunk_text, chunk_index, created_at)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (article_id, chunk_index) DO UPDATE SET
                chunk_text = EXCLUDED.chunk_text,
                created_at = EXCLUDED.created_at
        """, (
            chunk_id,
            article_id,
            chunk['text'],
            chunk['index'],
            datetime.now()
        ))

def check_existing_data(cursor) -> dict:
    """Проверяет существующие данные в базе"""
    stats = {}
    
    # Проверяем статьи
    cursor.execute("SELECT COUNT(*) FROM kb_articles")
    stats['articles'] = cursor.fetchone()[0]
    
    # Проверяем чанки
    cursor.execute("SELECT COUNT(*) FROM kb_chunks")
    stats['chunks'] = cursor.fetchone()[0]
    
    # Проверяем чанки с эмбеддингами
    cursor.execute("SELECT COUNT(*) FROM kb_chunks WHERE embedding IS NOT NULL")
    stats['chunks_with_embeddings'] = cursor.fetchone()[0]
    
    return stats

def main():
    """Основная функция"""
    print("🚀 Запуск оптимизированной загрузки знаний в Supabase")
    
    # Путь к папке с файлами знаний
    kb_path = Path('apps/support-gateway/kb_articles')
    
    if not kb_path.exists():
        print(f"❌ Папка {kb_path} не найдена")
        print("📁 Создаем тестовые данные...")
        
        # Создаем тестовую папку и файл
        kb_path.mkdir(parents=True, exist_ok=True)
        test_file = kb_path / "test-article.md"
        test_file.write_text("""---
title: "Тестовая статья"
slug: "test-article"
tags: ["тест", "документация"]
---

# Тестовая статья

Это тестовая статья для проверки работы системы загрузки знаний.

## Основные разделы

1. **Введение** - базовые концепции
2. **Практика** - примеры использования
3. **Заключение** - итоги и рекомендации

## Дополнительная информация

Эта статья содержит важную информацию для пользователей системы.
""")
        print(f"✅ Создан тестовый файл: {test_file}")
    
    # Подключение к базе данных
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        print("✅ Подключение к Supabase установлено")
    except Exception as e:
        print(f"❌ Ошибка подключения к Supabase: {e}")
        sys.exit(1)
    
    try:
        # Проверяем существующие данные
        print("\n📊 Проверка существующих данных...")
        existing_stats = check_existing_data(cursor)
        print(f"  - Статей: {existing_stats['articles']}")
        print(f"  - Чанков: {existing_stats['chunks']}")
        print(f"  - Чанков с эмбеддингами: {existing_stats['chunks_with_embeddings']}")
        
        # Получаем список markdown файлов
        md_files = list(kb_path.glob('*.md'))
        print(f"\n📁 Найдено {len(md_files)} markdown файлов")
        
        if not md_files:
            print("❌ Markdown файлы не найдены")
            return
        
        # Загружаем каждый файл
        loaded_count = 0
        chunks_created = 0
        
        for md_file in md_files:
            try:
                print(f"\n📖 Обрабатываю {md_file.name}...")
                
                # Парсим файл
                article_data = parse_markdown_file(md_file)
                
                # Создаем статью в базе
                article_id = create_kb_article(cursor, article_data)
                print(f"  ✅ Статья '{article_data['title']}' загружена (ID: {article_id})")
                
                # Создаем чанки
                create_chunks_from_article(cursor, article_id, article_data)
                print(f"  📝 Чанки созданы для статьи")
                
                loaded_count += 1
                
            except Exception as e:
                print(f"  ❌ Ошибка обработки {md_file.name}: {e}")
                continue
        
        # Коммитим изменения
        conn.commit()
        print(f"\n🎉 Загрузка завершена!")
        print(f"  - Загружено статей: {loaded_count}")
        
        # Показываем финальную статистику
        final_stats = check_existing_data(cursor)
        print(f"\n📊 Финальная статистика:")
        print(f"  - Всего статей: {final_stats['articles']}")
        print(f"  - Всего чанков: {final_stats['chunks']}")
        print(f"  - Чанков с эмбеддингами: {final_stats['chunks_with_embeddings']}")
        
        if final_stats['chunks_with_embeddings'] == 0:
            print(f"\n⚠️  Внимание: Чанки созданы, но эмбеддинги не сгенерированы")
            print(f"   Для генерации эмбеддингов нужен OpenAI API ключ")
        
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        conn.rollback()
    finally:
        cursor.close()
        conn.close()
        print("🔌 Соединение с Supabase закрыто")

if __name__ == "__main__":
    main()
