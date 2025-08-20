-- Initial PostgreSQL setup for local development
-- This file is mounted into /docker-entrypoint-initdb.d/init.sql by docker-compose
-- It can be used to seed schema or default data on first container startup

-- Safety no-op statement to ensure the file is valid SQL
SELECT 1;

-- You can extend this file with your schema if needed, or rely on migrations.

