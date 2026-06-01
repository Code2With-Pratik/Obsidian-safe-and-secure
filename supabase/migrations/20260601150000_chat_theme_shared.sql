-- Per-chat theme: when one participant picks a theme, both sides see it.
-- Stored on the chats row so the existing chats realtime channel broadcasts
-- the change to every member.

ALTER TABLE chats
  ADD COLUMN IF NOT EXISTS theme       TEXT,
  ADD COLUMN IF NOT EXISTS custom_bg   TEXT;

ALTER TABLE chats REPLICA IDENTITY FULL;
