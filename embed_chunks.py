# embed_chunks.py
# ===
# Встраивания для kb_chunks.embedding (pgvector).
# Берём текст из COALESCE(chunk_text, content), считаем эмбеддинги OpenAI
# (text-embedding-3-small) и записываем в колонку vector через текстовый каст ::vector.
#
# Переменные окружения:
#   OPENAI_API_KEY  — ключ OpenAI
#   DATABASE_URL    — строка подключения Postgres (например, postgresql://user:pass@host:port/db)
# Необязательные:
#   BATCH_SIZE      — размер батча (по умолчанию 64)
#   LIMIT_ROWS      — максимум строк за прогон (по умолчанию без лимита)
#
# Запуск (PowerShell):
#   $env:OPENAI_API_KEY="sk-..."; $env:DATABASE_URL="postgresql://..."; C:\Python313\python.exe embed_chunks.py

import os
import sys
import math
import time
import random
from typing import List, Tuple

import psycopg2
from psycopg2.extras import DictCursor

from openai import OpenAI
from openai import RateLimitError, APIError, APIConnectionError, InternalServerError

EMB_MODEL = "text-embedding-3-small"  # 1536-dim, дешево и годно для RU/EN
DEFAULT_BATCH = int(os.getenv("BATCH_SIZE", "64"))
LIMIT_ROWS = os.getenv("LIMIT_ROWS")
LIMIT_ROWS = int(LIMIT_ROWS) if LIMIT_ROWS and LIMIT_ROWS.isdigit() else None

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: переменная окружения DATABASE_URL не задана.")
    sys.exit(1)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    print("ERROR: переменная окружения OPENAI_API_KEY не задана.")
    sys.exit(1)

client = OpenAI(api_key=OPENAI_API_KEY)


def vector_to_sql(vec: List[float]) -> str:
    # Текстовый формат pgvector: '[v1, v2, ...]'
    # Округляем до 6 знаков после запятой для компактности (качество не страдает)
    return "[" + ", ".join(f"{x:.6f}" for x in vec) + "]"


def fetch_batch(cur, limit: int) -> List[Tuple[str, str]]:
    """
    Возвращает список (id, text) где embedding IS NULL.
    Читает из COALESCE(chunk_text, content).
    """
    sql = """
        SELECT id, COALESCE(chunk_text, content) AS txt
        FROM kb_chunks
        WHERE embedding IS NULL
        ORDER BY created_at, chunk_index
        LIMIT %s
    """
    cur.execute(sql, (limit,))
    rows = cur.fetchall()
    return [(str(r[0]), r[1] or "") for r in rows]


def embed_with_retry(texts: List[str], max_retries: int = 6) -> List[List[float]]:
    """
    Получает эмбеддинги для батча с экспоненциальным бэкоффом на 429/500/сетевые.
    """
    for attempt in range(max_retries):
        try:
            resp = client.embeddings.create(model=EMB_MODEL, input=texts)
            return [d.embedding for d in resp.data]
        except (RateLimitError, APIConnectionError, InternalServerError, APIError) as e:
            # APIError у v1 может быть 5xx — тоже ретралим
            delay = 2 ** attempt + random.random()
            print(
                f"[WARN] OpenAI error ({type(e).__name__}): {e}. retry in {delay:.1f}s")
            time.sleep(delay)
    raise RuntimeError(
        "Не удалось получить эмбеддинги после повторных попыток.")


def update_embeddings(cur, items: List[Tuple[str, List[float]]]):
    """
    Обновляет embedding для списка (id, vector).
    Используем текстовый формат и каст ::vector на стороне SQL.
    """
    sql = "UPDATE kb_chunks SET embedding = %s::vector WHERE id = %s"
    for _id, vec in items:
        cur.execute(sql, (vector_to_sql(vec), _id))


def count_remaining(cur) -> int:
    cur.execute("SELECT COUNT(*) FROM kb_chunks WHERE embedding IS NULL")
    return int(cur.fetchone()[0])


def main():
    batch_size = DEFAULT_BATCH
    print(f"[INFO] Model: {EMB_MODEL}")
    print(f"[INFO] Batch size: {batch_size}")
    if LIMIT_ROWS:
        print(f"[INFO] Limit rows this run: {LIMIT_ROWS}")

    # Подключаемся к БД
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = False  # будем коммитить батчами

    try:
        with conn.cursor(cursor_factory=DictCursor) as cur:
            total_before = count_remaining(cur)
            print(f"[INFO] Rows to embed before run: {total_before}")

            remaining_limit = LIMIT_ROWS if LIMIT_ROWS else total_before
            processed = 0

            while True:
                if remaining_limit is not None and remaining_limit <= 0:
                    break

                take = batch_size
                if remaining_limit is not None:
                    take = min(take, remaining_limit)

                rows = fetch_batch(cur, take)
                if not rows:
                    break

                texts = [t for (_id, t) in rows]
                ids = [i for (i, _t) in rows]

                # Получаем эмбеддинги
                vectors = embed_with_retry(texts)

                # Обновляем БД
                pairs = list(zip(ids, vectors))
                update_embeddings(cur, pairs)
                conn.commit()

                processed += len(rows)
                if remaining_limit is not None:
                    remaining_limit -= len(rows)

                left = count_remaining(cur)
                print(
                    f"[OK] batch {len(rows)} saved. processed={processed}, left={left}")

            total_after = count_remaining(cur)
            print(f"[DONE] Embedded this run: {total_before - total_after}")
            print(f"[DONE] Still missing: {total_after}")

    finally:
        conn.close()


if __name__ == "__main__":
    main()
