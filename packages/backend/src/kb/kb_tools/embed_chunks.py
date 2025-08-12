#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
from dotenv import load_dotenv
from openai import OpenAI
import psycopg2

# --------- конфиг ---------
BATCH_SIZE = 64  # сколько чанков эмбеддить за один запрос
EMBED_MODEL = os.getenv("EMBED_MODEL", "text-embedding-3-small")
# ---------------------------


def to_vector_literal(vec):
    """Преобразуем список чисел в строку вида '[0.1,0.2,...]' для ::vector."""
    return "[" + ",".join(f"{x:.8f}" for x in vec) + "]"


def fetch_batch(conn, limit=BATCH_SIZE):
    """Берём батч чанков без эмбеддинга."""
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, COALESCE(NULLIF(chunk_text, ''), content) AS src
            FROM kb_chunks
            WHERE embedding IS NULL
            ORDER BY created_at
            LIMIT %s;
            """,
            (limit,),
        )
        return cur.fetchall()


def embed_texts(client, texts):
    """Получаем эмбеддинги для списка текстов одним батчем."""
    resp = client.embeddings.create(
        model=EMBED_MODEL,
        input=texts
    )
    return [d.embedding for d in resp.data]


def update_batch(conn, rows, vectors):
    """Обновляем embedding по id (по одному — 152 записей это быстро)."""
    with conn.cursor() as cur:
        for (chunk_id, _), vec in zip(rows, vectors):
            cur.execute(
                "UPDATE kb_chunks SET embedding = %s::vector WHERE id = %s;",
                (to_vector_literal(vec), chunk_id),
            )
    conn.commit()


def main():
    load_dotenv()

    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise RuntimeError("Не задан DATABASE_URL в .env")
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("Не задан OPENAI_API_KEY в .env")

    client = OpenAI(api_key=api_key)

    with psycopg2.connect(db_url) as conn:
        total = 0
        while True:
            rows = fetch_batch(conn, BATCH_SIZE)
            if not rows:
                break

            texts = [(t or " ").strip() or " " for _,
                     t in rows]  # на всякий случай
            vectors = embed_texts(client, texts)
            update_batch(conn, rows, vectors)

            total += len(rows)
            print(f"✓ Добавлено эмбеддингов: {total}")

    print("Готово. Все отсутствующие эмбеддинги записаны.")


if __name__ == "__main__":
    main()
