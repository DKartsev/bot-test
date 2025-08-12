import os
from pathlib import Path
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import register_vector
from openai import OpenAI
import time

# Загружаем .env, лежащий рядом со скриптом
load_dotenv(dotenv_path=Path(__file__).resolve().parent / ".env")

DATABASE_URL = os.getenv("DATABASE_URL")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
# дешёвые и быстрые эмбеддинги
EMB_MODEL = os.getenv("EMB_MODEL", "text-embedding-3-small")

assert DATABASE_URL, "DATABASE_URL not set"
assert OPENAI_API_KEY, "OPENAI_API_KEY not set"

client = OpenAI(api_key=OPENAI_API_KEY)


def fetch_pending_chunks(conn, limit=200):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT id, chunk_text
            FROM kb_chunks
            WHERE embedding IS NULL
            ORDER BY created_at ASC
            LIMIT %s
        """, (limit,))
        return cur.fetchall()


def embed_batch(texts):
    # OpenAI embeddings API — одна батч-заявка
    resp = client.embeddings.create(model=EMB_MODEL, input=texts)
    return [item.embedding for item in resp.data]


def update_embeddings(conn, rows, vectors):
    with conn.cursor() as cur:
        for (chunk_id, _), vec in zip(rows, vectors):
            # vector-литерал в Postgres: '[-0.1, 0.2, ...]'::vector
            vec_literal = "[" + ",".join(f"{x:.7f}" for x in vec) + "]"
            cur.execute("""
                UPDATE kb_chunks
                SET embedding = %s::vector
                WHERE id = %s
            """, (vec_literal, chunk_id))
    conn.commit()


def main():
    conn = psycopg2.connect(DATABASE_URL)
    register_vector(conn)  # регистрируем тип vector для psycopg2 (из pgvector)

    total = 0
    while True:
        rows = fetch_pending_chunks(conn, limit=200)
        if not rows:
            print(f"Done. Embedded {total} chunks.")
            break

        texts = [r[1] or "" for r in rows]
        vectors = embed_batch(texts)
        update_embeddings(conn, rows, vectors)
        total += len(rows)
        print(f"Embedded {total}...")
        time.sleep(0.5)  # чутка бережём API

    conn.close()


if __name__ == "__main__":
    main()
