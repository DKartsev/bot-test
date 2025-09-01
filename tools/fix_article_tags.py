#!/usr/bin/env python3
"""
Скрипт для исправления тегов в статьях базы знаний
"""

import psycopg2
import sys
import json
import re

# Конфигурация базы данных Supabase
DB_CONFIG = {
    'host': 'aws-0-eu-north-1.pooler.supabase.com',
    'port': 5432,
    'database': 'postgres',
    'user': 'postgres.ymfduihrjjuzwuckbjjh',
    'password': 'mn4c0Je402fgh3mc5'
}

def fix_article_tags():
    """Исправляет теги в статьях базы знаний"""
    try:
        # Подключение к базе данных
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        print("✅ Подключение к Supabase установлено")
        
        # Получаем все статьи
        cursor.execute("""
            SELECT id, title, slug, tags 
            FROM kb_articles 
            ORDER BY title
        """)
        articles = cursor.fetchall()
        
        print(f"\n📊 Найдено {len(articles)} статей")
        
        fixed_count = 0
        updated_count = 0
        
        for article in articles:
            article_id, title, slug, tags = article
            
            # Проверяем текущие теги
            current_tags = []
            needs_fix = False
            
            if tags:
                try:
                    # Пытаемся парсить как JSON
                    if isinstance(tags, str):
                        current_tags = json.loads(tags)
                    else:
                        current_tags = tags
                except (json.JSONDecodeError, TypeError):
                    # Если не JSON, пытаемся извлечь теги из текста
                    needs_fix = True
                    print(f"  ⚠️  Проблема с тегами в статье '{title}'")
            
            # Если тегов нет или они пустые, добавляем базовые теги
            if not current_tags or current_tags == [] or current_tags == ['']:
                needs_fix = True
                # Генерируем теги на основе заголовка и slug
                base_tags = ['документация']
                
                # Добавляем теги на основе ключевых слов в заголовке
                title_lower = title.lower()
                if any(word in title_lower for word in ['инструкция', 'руководство', 'гайд']):
                    base_tags.append('инструкция')
                if any(word in title_lower for word in ['настройка', 'конфигурация', 'установка']):
                    base_tags.append('настройка')
                if any(word in title_lower for word in ['ошибка', 'проблема', 'решение']):
                    base_tags.append('устранение-неполадок')
                if any(word in title_lower for word in ['api', 'интеграция', 'подключение']):
                    base_tags.append('api')
                if any(word in title_lower for word in ['безопасность', 'защита', 'доступ']):
                    base_tags.append('безопасность')
                
                # Добавляем тег на основе slug
                if 'bot' in slug.lower():
                    base_tags.append('бот')
                if 'admin' in slug.lower():
                    base_tags.append('администрирование')
                if 'user' in slug.lower():
                    base_tags.append('пользователь')
                
                current_tags = base_tags
                print(f"  📝 Добавлены теги для '{title}': {current_tags}")
            
            if needs_fix:
                # Обновляем теги в базе данных
                cursor.execute("""
                    UPDATE kb_articles 
                    SET tags = %s 
                    WHERE id = %s
                """, (json.dumps(current_tags), article_id))
                updated_count += 1
            
            fixed_count += 1
        
        # Коммитим изменения
        conn.commit()
        print(f"\n🎉 Исправление завершено!")
        print(f"  - Обработано статей: {fixed_count}")
        print(f"  - Обновлено статей: {updated_count}")
        
        # Показываем статистику тегов (исправленная версия)
        try:
            cursor.execute("""
                SELECT tags, COUNT(*) as count
                FROM kb_articles 
                WHERE tags IS NOT NULL AND tags != '[]' AND tags != 'null' AND tags != '""'
                GROUP BY tags 
                ORDER BY count DESC 
                LIMIT 10
            """)
            tag_stats = cursor.fetchall()
        except Exception as e:
            print(f"    ⚠️  Ошибка получения статистики тегов: {e}")
            tag_stats = []
        
        print(f"\n📊 Топ тегов:")
        for tags, count in tag_stats:
            try:
                tag_list = json.loads(tags) if isinstance(tags, str) else tags
                print(f"  - {tag_list}: {count} статей")
            except:
                print(f"  - {tags}: {count} статей")
        
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        if 'conn' in locals():
            conn.rollback()
        sys.exit(1)
    finally:
        if 'conn' in locals():
            cursor.close()
            conn.close()
            print("🔌 Соединение с Supabase закрыто")

if __name__ == "__main__":
    fix_article_tags()
