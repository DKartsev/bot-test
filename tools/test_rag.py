#!/usr/bin/env python3
"""
Тестовый скрипт для проверки работы RAG пайплайна
"""

import os
import sys
import json
import time
from typing import Dict, Any

# Добавляем текущую директорию в путь для импорта
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from bot_search import RAGClient

def test_rag_health(client: RAGClient) -> bool:
    """Тест здоровья RAG сервиса"""
    print("🏥 Проверка здоровья RAG сервиса...")
    
    try:
        health = client.get_health()
        if health.get("success"):
            print("✅ Сервис здоров")
            print(f"   Статус: {health['data']['status']}")
            print(f"   Время: {health['data']['timestamp']}")
            return True
        else:
            print("❌ Сервис нездоров")
            print(f"   Ошибка: {health.get('error', 'Неизвестная ошибка')}")
            return False
    except Exception as e:
        print(f"❌ Ошибка проверки здоровья: {e}")
        return False

def test_model_info(client: RAGClient) -> bool:
    """Тест получения информации о модели"""
    print("\n🤖 Получение информации о модели...")
    
    try:
        model_info = client.get_model_info()
        if model_info.get("success"):
            data = model_info["data"]
            print("✅ Информация о модели получена")
            print(f"   Модель: {data['model']}")
            print(f"   Провайдер: {data['provider']}")
            print(f"   Макс токенов: {data['maxTokens']}")
            print(f"   Температура: {data['temperature']}")
            return True
        else:
            print("❌ Не удалось получить информацию о модели")
            return False
    except Exception as e:
        print(f"❌ Ошибка получения информации о модели: {e}")
        return False

def test_pipeline_stats(client: RAGClient) -> bool:
    """Тест получения статистики пайплайна"""
    print("\n📊 Получение статистики пайплайна...")
    
    try:
        stats = client.get_stats()
        if stats.get("success"):
            data = stats["data"]
            print("✅ Статистика получена")
            print(f"   Сервис: {data.get('service', 'N/A')}")
            print(f"   Версия: {data.get('version', 'N/A')}")
            print(f"   Время: {data.get('timestamp', 'N/A')}")
            return True
        else:
            print("❌ Не удалось получить статистику")
            return False
    except Exception as e:
        print(f"❌ Ошибка получения статистики: {e}")
        return False

def test_pipeline_test(client: RAGClient, test_query: str) -> bool:
    """Тест тестирования пайплайна"""
    print(f"\n🧪 Тестирование пайплайна с запросом: '{test_query}'")
    
    try:
        test_result = client.test_pipeline(test_query)
        if test_result.get("success"):
            print("✅ Тестирование пайплайна успешно")
            data = test_result["data"]
            print(f"   Статус: {data.get('pipelineStatus', 'N/A')}")
            if "response" in data:
                response = data["response"]
                print(f"   Ответ: {response.get('answer', 'N/A')[:100]}...")
                print(f"   Уверенность: {response.get('confidence', 'N/A')}")
                print(f"   Источники: {len(response.get('sources', []))}")
            return True
        else:
            print("❌ Тестирование пайплайна не удалось")
            print(f"   Ошибка: {test_result.get('error', 'Неизвестная ошибка')}")
            return False
    except Exception as e:
        print(f"❌ Ошибка тестирования пайплайна: {e}")
        return False

def test_real_query(client: RAGClient, question: str, context: str = None) -> bool:
    """Тест реального запроса"""
    print(f"\n🔍 Тест реального запроса: '{question}'")
    
    try:
        start_time = time.time()
        
        response = client.process_query(
            question=question,
            context=context,
            user_id=999,
            chat_id=888,
            options={
                "temperature": 0.3,
                "maxTokens": 2000,
                "useHybridSearch": True
            }
        )
        
        end_time = time.time()
        processing_time = end_time - start_time
        
        if response.get("success"):
            print("✅ Запрос обработан успешно")
            data = response["data"]
            print(f"   Ответ: {data.get('answer', 'N/A')[:200]}...")
            print(f"   Уверенность: {data.get('confidence', 'N/A')}")
            print(f"   Время поиска: {data.get('searchTime', 'N/A')}ms")
            print(f"   Время обработки: {data.get('processingTime', 'N/A')}ms")
            print(f"   Общее время: {data.get('totalTime', 'N/A')}ms")
            print(f"   Время клиента: {processing_time:.2f}s")
            print(f"   Источники: {len(data.get('sources', []))}")
            
            # Показываем метаданные
            metadata = data.get('metadata', {})
            if metadata:
                print(f"   Переформулированный запрос: {metadata.get('queryRephrased', 'N/A')}")
                print(f"   Стратегия поиска: {metadata.get('searchStrategy', 'N/A')}")
                print(f"   Модель: {metadata.get('modelUsed', 'N/A')}")
            
            return True
        else:
            print("❌ Запрос не обработан")
            print(f"   Ошибка: {response.get('error', 'Неизвестная ошибка')}")
            return False
    except Exception as e:
        print(f"❌ Ошибка обработки запроса: {e}")
        return False

def test_search_config_update(client: RAGClient) -> bool:
    """Тест обновления конфигурации поиска"""
    print("\n⚙️ Тест обновления конфигурации поиска...")
    
    try:
        new_config = {
            "vectorWeight": 0.8,
            "keywordWeight": 0.2,
            "maxResults": 15,
            "minScore": 0.4
        }
        
        result = client.update_search_config(new_config)
        if result.get("success"):
            print("✅ Конфигурация обновлена успешно")
            print(f"   Обновленная конфигурация: {json.dumps(new_config, indent=2)}")
            return True
        else:
            print("❌ Не удалось обновить конфигурацию")
            print(f"   Ошибка: {result.get('error', 'Неизвестная ошибка')}")
            return False
    except Exception as e:
        print(f"❌ Ошибка обновления конфигурации: {e}")
        return False

def run_all_tests(backend_url: str = None) -> Dict[str, bool]:
    """Запуск всех тестов"""
    print("🚀 Запуск тестов RAG пайплайна")
    print("=" * 60)
    
    # Создаем клиент
    client = RAGClient(backend_url)
    
    # Список тестов
    tests = [
        ("Здоровье сервиса", lambda: test_rag_health(client)),
        ("Информация о модели", lambda: test_model_info(client)),
        ("Статистика пайплайна", lambda: test_pipeline_stats(client)),
        ("Тестирование пайплайна", lambda: test_pipeline_test(client, "Как пополнить баланс через QR-код?")),
        ("Реальный запрос 1", lambda: test_real_query(client, "Как пополнить баланс через QR-код?", "Пользователь интересуется способами пополнения")),
        ("Реальный запрос 2", lambda: test_real_query(client, "Что делать если упал рейтинг?", "Проблема с рейтингом пользователя")),
        ("Обновление конфигурации", lambda: test_search_config_update(client)),
    ]
    
    results = {}
    
    # Запускаем тесты
    for test_name, test_func in tests:
        try:
            print(f"\n{'='*20} {test_name} {'='*20}")
            results[test_name] = test_func()
        except Exception as e:
            print(f"❌ Критическая ошибка в тесте '{test_name}': {e}")
            results[test_name] = False
    
    # Выводим итоги
    print("\n" + "=" * 60)
    print("📋 ИТОГИ ТЕСТИРОВАНИЯ")
    print("=" * 60)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ ПРОЙДЕН" if result else "❌ ПРОВАЛЕН"
        print(f"{test_name}: {status}")
        if result:
            passed += 1
    
    print(f"\nРезультат: {passed}/{total} тестов пройдено")
    
    if passed == total:
        print("🎉 Все тесты пройдены успешно!")
    else:
        print("⚠️ Некоторые тесты не пройдены")
    
    return results

def main():
    """Главная функция"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Тестирование RAG пайплайна")
    parser.add_argument(
        "--backend-url", 
        default="http://localhost:3002",
        help="URL backend сервера (по умолчанию: http://localhost:3002)"
    )
    parser.add_argument(
        "--single-test",
        choices=["health", "model", "stats", "pipeline", "query", "config"],
        help="Запустить только один тест"
    )
    
    args = parser.parse_args()
    
    if args.single_test:
        # Запуск одного теста
        client = RAGClient(args.backend_url)
        
        if args.single_test == "health":
            test_rag_health(client)
        elif args.single_test == "model":
            test_model_info(client)
        elif args.single_test == "stats":
            test_pipeline_stats(client)
        elif args.single_test == "pipeline":
            test_pipeline_test(client, "Как пополнить баланс через QR-код?")
        elif args.single_test == "query":
            test_real_query(client, "Как пополнить баланс через QR-код?")
        elif args.single_test == "config":
            test_search_config_update(client)
    else:
        # Запуск всех тестов
        run_all_tests(args.backend_url)

if __name__ == "__main__":
    main()
