#!/usr/bin/env python3
"""
Скрипт для загрузки знаний из markdown файлов в базу данных PostgreSQL
"""

import os
import sys
import psycopg2
import uuid
from datetime import datetime
from pathlib import Path
import re

# Конфигурация базы данных
DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'database': 'support_db',
    'user': 'postgres',
    'password': 'postgres'
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
        article_data['tags'],
        datetime.now()
    ))
    
    return cursor.fetchone()[0]

def main():
    """Основная функция"""
    # Путь к папке с файлами знаний
    kb_path = Path('../apps/support-gateway/kb_articles')
    
    if not kb_path.exists():
        print(f"❌ Папка {kb_path} не найдена")
        sys.exit(1)
    
    # Подключение к базе данных
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        print("✅ Подключение к базе данных установлено")
    except Exception as e:
        print(f"❌ Ошибка подключения к базе данных: {e}")
        sys.exit(1)
    
    try:
        # Получаем список markdown файлов
        md_files = list(kb_path.glob('*.md'))
        print(f"📁 Найдено {len(md_files)} markdown файлов")
        
        if not md_files:
            print("❌ Markdown файлы не найдены")
            return
        
        # Загружаем каждый файл
        loaded_count = 0
        for md_file in md_files:
            try:
                print(f"📖 Обрабатываю {md_file.name}...")
                
                # Парсим файл
                article_data = parse_markdown_file(md_file)
                
                # Создаем статью в базе
                article_id = create_kb_article(cursor, article_data)
                
                print(f"✅ Статья '{article_data['title']}' загружена (ID: {article_id})")
                loaded_count += 1
                
            except Exception as e:
                print(f"❌ Ошибка обработки {md_file.name}: {e}")
                continue
        
        # Коммитим изменения
        conn.commit()
        print(f"\n🎉 Загрузка завершена! Загружено {loaded_count} статей")
        
        # Показываем статистику
        cursor.execute("SELECT COUNT(*) FROM kb_articles")
        total_count = cursor.fetchone()[0]
        print(f"📊 Всего статей в базе: {total_count}")
        
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        conn.rollback()
    finally:
        cursor.close()
        conn.close()
        print("🔌 Соединение с базой данных закрыто")

if __name__ == "__main__":
    main()
