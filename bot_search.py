# bot_search.py
import os
import json
import time
import argparse
import psycopg2
from openai import OpenAI

# --- настройки окружения ---
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
DATABASE_URL = os.getenv("DATABASE_URL")
EMB_MODEL = os.getenv("EMB_MODEL", "text-embedding-3-small")

if not DATABASE_URL:
    raise SystemExit("ERROR: переменная окружения DATABASE_URL не задана.")
if not OPENAI_API_KEY:
    print("[WARN] OPENAI_API_KEY не задан — поищу без эмбеддинга (только текстовый режим).")

client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None


def embed_query(q: str):
    """Возвращает вектор float[] или None (если нет ключа/квоты/ошибка)."""
    if not client:
        return None
    try:
        resp = client.embeddings.create(model=EMB_MODEL, input=q)
        v = resp.data[0].embedding
        return [float(x) for x in v]   # pgvector ждёт float4[]
    except Exception as e:
        print(f"[WARN] эмбеддинг не получился: {e}")
        return None


def kb_search(q_text: str, top_n: int = 5, w_vec: float = 0.75, w_text: float = 0.25):
    """
    Вызывает вашу SQL-функцию:
      public.kb_search_json(p_q_text text, p_q_vec float4[], p_top_n int, p_w_vec real, p_w_text real)
    Возвращает список словарей: [{article_id, slug, title, score, excerpt}, ...]
    """
    q_vec = embed_query(q_text)

    t0 = time.time()
    with psycopg2.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT public.kb_search_json(%s, %s::float4[], %s, %s, %s);",
                (q_text, q_vec, top_n, w_vec, w_text)
            )
            res = cur.fetchone()[0]  # jsonb или None
    took_ms = int((time.time() - t0) * 1000)

    items = res or []
    used_vec = q_vec is not None and len(q_vec) == 1536
    top = items[0] if items else None

    # необязательное логирование (если вы уже создали public.kb_log_query)
    try:
        with psycopg2.connect(DATABASE_URL) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT public.kb_log_query(%s,%s,%s,%s,%s,%s,%s);",
                    (
                        q_text,
                        used_vec,
                        (top or {}).get("slug"),
                        float((top or {}).get("score") or 0.0),
                        (top or {}).get("article_id"),
                        took_ms,
                        False,   # handoff_to_operator
                    )
                )
    except Exception as e:
        # не мешаем основному потоку
        print(f"[INFO] лог не записан: {e}")

    return items


def build_answer(query: str, candidates: list) -> str:
    """
    Простой черновик ответа без LLM:
    - Берём топ-1 заголовок и сниппет
    - Мягкая эскалация при низкой уверенности
    """
    if not candidates:
        return ("Пока не нашёл точный ответ. "
                "Могу уточнить детали или сразу подключить оператора — как удобнее?")

    top = candidates[0]
    title = top.get("title") or "Найденная статья"
    excerpt = (top.get("excerpt") or "").strip()
    score = float(top.get("score") or 0.0)

    msg = [f"Похоже, это про: «{title}».", excerpt]
    if score < 0.10:
        msg.append(
            "\nНе уверен на 100%. Могу задать пару уточняющих вопросов или подключить оператора.")
    else:
        msg.append(
            "\nЕсли что-то осталось неясно — подскажу дальше или подключу оператора.")
    return "\n".join(m for m in msg if m)


def main():
    ap = argparse.ArgumentParser(description="Поиск по базе знаний Rapira")
    ap.add_argument("query", help="Вопрос пользователя (строка)")
    ap.add_argument("--top", type=int, default=5,
                    help="Количество кандидатов (по умолчанию 5)")
    ap.add_argument("--w-vec", type=float, default=0.75,
                    help="Вес векторного поиска (0..1)")
    ap.add_argument("--w-text", type=float, default=0.25,
                    help="Вес текстового поиска (0..1)")
    ap.add_argument("--json", action="store_true",
                    help="Показать только JSON-кандидаты и выйти")
    args = ap.parse_args()

    items = kb_search(args.query, top_n=args.top,
                      w_vec=args.w_vec, w_text=args.w_text)

    if args.json:
        print(json.dumps(items, ensure_ascii=False, indent=2))
        return

    print(json.dumps(items, ensure_ascii=False, indent=2))
    print("\n---\n")
    print(build_answer(args.query, items))


if __name__ == "__main__":
    main()
