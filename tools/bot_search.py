import os
import json
import requests
from typing import Dict, List, Optional, Any

BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:3002")

class RAGClient:
    """
    Клиент для работы с RAG пайплайном
    """
    
    def __init__(self, backend_url: str = None):
        self.backend_url = backend_url or BACKEND_URL
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'RAG-Client/1.0'
        })

    def process_query(self, question: str, context: str = None, user_id: int = None, 
                     chat_id: int = None, language: str = "ru", options: Dict = None) -> Dict:
        """
        Основной метод для обработки запроса через RAG пайплайн
        
        Args:
            question: Вопрос пользователя
            context: Дополнительный контекст
            user_id: ID пользователя
            chat_id: ID чата
            language: Язык (по умолчанию русский)
            options: Дополнительные опции
            
        Returns:
            Dict с ответом от RAG пайплайна
        """
        payload = {
            "question": question,
            "context": context,
            "userId": user_id,
            "chatId": chat_id,
            "language": language,
            "options": options or {}
        }
        
        try:
            response = self.session.post(
                f"{self.backend_url}/api/rag/query",
                json=payload,
                timeout=120  # Увеличиваем timeout для RAG обработки
            )
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            print(f"Ошибка запроса к RAG API: {e}")
            return {"error": str(e), "success": False}

    def test_pipeline(self, test_query: str) -> Dict:
        """
        Тестирование RAG пайплайна
        
        Args:
            test_query: Тестовый запрос
            
        Returns:
            Dict с результатами тестирования
        """
        payload = {"testQuery": test_query}
        
        try:
            response = self.session.post(
                f"{self.backend_url}/api/rag/test",
                json=payload,
                timeout=60
            )
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            print(f"Ошибка тестирования RAG пайплайна: {e}")
            return {"error": str(e), "success": False}

    def get_stats(self) -> Dict:
        """
        Получение статистики RAG пайплайна
        
        Returns:
            Dict со статистикой
        """
        try:
            response = self.session.get(
                f"{self.backend_url}/api/rag/stats",
                timeout=30
            )
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            print(f"Ошибка получения статистики: {e}")
            return {"error": str(e), "success": False}

    def get_health(self) -> Dict:
        """
        Проверка здоровья RAG сервиса
        
        Returns:
            Dict со статусом здоровья
        """
        try:
            response = self.session.get(
                f"{self.backend_url}/api/rag/health",
                timeout=30
            )
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            print(f"Ошибка проверки здоровья: {e}")
            return {"error": str(e), "success": False}

    def get_model_info(self) -> Dict:
        """
        Получение информации о модели
        
        Returns:
            Dict с информацией о модели
        """
        try:
            response = self.session.get(
                f"{self.backend_url}/api/rag/model-info",
                timeout=30
            )
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            print(f"Ошибка получения информации о модели: {e}")
            return {"error": str(e), "success": False}

    def update_search_config(self, search_config: Dict) -> Dict:
        """
        Обновление конфигурации поиска
        
        Args:
            search_config: Новая конфигурация поиска
            
        Returns:
            Dict с результатом обновления
        """
        payload = {"searchConfig": search_config}
        
        try:
            response = self.session.put(
                f"{self.backend_url}/api/rag/config",
                json=payload,
                timeout=30
            )
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            print(f"Ошибка обновления конфигурации: {e}")
            return {"error": str(e), "success": False}

# Обратная совместимость - оставляем старую функцию
def bot_search_and_refine(question: str, draft: str, sources: list, lang: str = "ru"):
    """
    Устаревшая функция для обратной совместимости.
    Рекомендуется использовать RAGClient.process_query()
    """
    client = RAGClient()
    return client.process_query(
        question=question,
        context=f"Черновик: {draft}",
        language=lang,
        options={
            "targetLang": lang,
            "minConfidenceToEscalate": 0.55,
            "temperature": 0.3
        }
    )

def demo_rag_pipeline():
    """
    Демонстрация работы RAG пайплайна
    """
    client = RAGClient()
    
    print("🚀 Демонстрация RAG пайплайна")
    print("=" * 50)
    
    # Проверяем здоровье сервиса
    print("\n1. Проверка здоровья сервиса:")
    health = client.get_health()
    print(json.dumps(health, ensure_ascii=False, indent=2))
    
    # Получаем информацию о модели
    print("\n2. Информация о модели:")
    model_info = client.get_model_info()
    print(json.dumps(model_info, ensure_ascii=False, indent=2))
    
    # Тестируем пайплайн
    print("\n3. Тестирование пайплайна:")
    test_result = client.test_pipeline("Как пополнить баланс через QR-код?")
    print(json.dumps(test_result, ensure_ascii=False, indent=2))
    
    # Получаем статистику
    print("\n4. Статистика пайплайна:")
    stats = client.get_stats()
    print(json.dumps(stats, ensure_ascii=False, indent=2))
    
    # Пример реального запроса
    print("\n5. Пример реального запроса:")
    query_result = client.process_query(
        question="Как пополнить баланс через QR-код?",
        context="Пользователь интересуется способами пополнения",
        user_id=123,
        chat_id=456,
        options={
            "temperature": 0.3,
            "maxTokens": 2000,
            "useHybridSearch": True
        }
    )
    print(json.dumps(query_result, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    # Запускаем демонстрацию
    demo_rag_pipeline()
    
    # Пример использования для обратной совместимости
    print("\n" + "=" * 50)
    print("Пример использования для обратной совместимости:")
    
    q = "Как пополнить через QR-код?"
    d = "Черновик ответа из гибридного поиска..."
    srcs = [{"id": "kb:qr_intro", "title": "QR-оплата", "url": "https://kb/qr"}]
    res = bot_search_and_refine(q, d, srcs)
    print(json.dumps(res, ensure_ascii=False, indent=2))
