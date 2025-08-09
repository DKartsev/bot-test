-- 004_alter_messages_media_types.sql
ALTER TABLE messages
  ALTER COLUMN media_types TYPE TEXT[]
  USING media_types::TEXT[];
