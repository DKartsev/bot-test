#!/usr/bin/env python3
"""
Скрипт для тестирования RAG API
"""

import requests
import json
import sys

# Конфигурация API
API_BASE_URL = "http://158.160.169.147:3000"

def test_rag_health():
    """Тестирует health endpoint RAG API"""
    try:
        response = requests.get(f"{API_BASE_URL}/api/rag/health", timeout=10)
        if response.status_code == 200:
            data = response.json()
            print("✅ RAG Health Check:")
            print(f"  Status: {data.get('data', {}).get('status', 'unknown')}")
            print(f"  Services: {data.get('data', {}).get('services', {})}")
            return True
        else:
            print(f"❌ RAG Health Check failed: {response.status_code}")
            print(f"  Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ RAG Health Check error: {e}")
        return False

def test_rag_query(question: str):
    """Тестирует RAG query endpoint"""
    try:
        payload = {"question": question}
        headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
        
        print(f"\n🔍 Тестируем запрос: '{question}'")
        
        response = requests.post(
            f"{API_BASE_URL}/api/rag/query",
            json=payload,
            headers=headers,
            timeout=30
        )
        
        print(f"  Status Code: {response.status_code}")
        print(f"  Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ RAG Query успешен:")
            print(f"  Answer: {data.get('data', {}).get('answer', 'No answer')}")
            print(f"  Sources: {len(data.get('data', {}).get('sources', []))} источников")
            return True
        else:
            print(f"❌ RAG Query failed: {response.status_code}")
            print(f"  Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ RAG Query error: {e}")
        return False

def test_backend_health():
    """Тестирует общий health endpoint backend"""
    try:
        response = requests.get(f"{API_BASE_URL}/health", timeout=10)
        if response.status_code == 200:
            data = response.json()
            print("✅ Backend Health Check:")
            print(f"  Status: {data.get('status', 'unknown')}")
            print(f"  Environment: {data.get('environment', 'unknown')}")
            print(f"  Redis: {data.get('redis', {}).get('status', 'unknown')}")
            return True
        else:
            print(f"❌ Backend Health Check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Backend Health Check error: {e}")
        return False

def main():
    """Основная функция тестирования"""
    print("🧪 Тестирование RAG API")
    print("=" * 50)
    
    # 1. Тестируем общий health backend
    print("\n1. Тестирование Backend Health...")
    backend_ok = test_backend_health()
    
    # 2. Тестируем RAG health
    print("\n2. Тестирование RAG Health...")
    rag_health_ok = test_rag_health()
    
    # 3. Тестируем RAG запросы
    if rag_health_ok:
        print("\n3. Тестирование RAG Queries...")
        
        test_questions = [
            "Что такое тестовая статья?",
            "Как работает система поддержки?",
            "Какие есть инструкции?",
            "Как настроить бота?",
            "Что делать при ошибках?"
        ]
        
        success_count = 0
        for question in test_questions:
            if test_rag_query(question):
                success_count += 1
        
        print(f"\n📊 Результаты тестирования:")
        print(f"  - Backend Health: {'✅' if backend_ok else '❌'}")
        print(f"  - RAG Health: {'✅' if rag_health_ok else '❌'}")
        print(f"  - RAG Queries: {success_count}/{len(test_questions)} успешных")
        
        if success_count == len(test_questions):
            print("\n🎉 Все тесты прошли успешно!")
        elif success_count > 0:
            print("\n⚠️  Частично успешно - есть проблемы")
        else:
            print("\n❌ Все тесты не прошли")
    else:
        print("\n❌ RAG Health не прошел, пропускаем тесты запросов")

if __name__ == "__main__":
    main()
