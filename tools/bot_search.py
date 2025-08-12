import os
import json
import requests

BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:3000")


def bot_search_and_refine(question: str, draft: str, sources: list, lang: str = "ru"):
    """
    Вы уже формируете draft через RPC к kb_*.
    Здесь мы просто дергаем перефразирование/эскалацию.
    """
    payload = {
        "question": question,
        "draft": draft,
        "sources": sources,
        "lang": lang,
        "options": {
            "targetLang": lang,
            "minConfidenceToEscalate": 0.55,
            "temperature": 0.3
        }
    }
    r = requests.post(f"{BACKEND_URL}/api/bot/refine",
                      json=payload, timeout=60)
    r.raise_for_status()
    return r.json()


if __name__ == "__main__":
    # пример
    q = "Как пополнить через QR-код?"
    d = "Черновик ответа из гибридного поиска..."
    srcs = [{"id": "kb:qr_intro", "title": "QR-оплата", "url": "https://kb/qr"}]
    res = bot_search_and_refine(q, d, srcs)
    print(json.dumps(res, ensure_ascii=False, indent=2))
