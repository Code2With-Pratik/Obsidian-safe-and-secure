-- Unread message count per chat for the calling user.
-- Returns one row per chat the user is a member of, with the number of
-- messages newer than that member's `last_read_at` AND not authored by them.

CREATE OR REPLACE FUNCTION get_unread_counts()
RETURNS TABLE (chat_id UUID, unread BIGINT)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    m.chat_id,
    COUNT(*)::BIGINT AS unread
  FROM messages m
  JOIN chat_members cm
    ON cm.chat_id = m.chat_id
   AND cm.user_id = auth.uid()
  WHERE m.author_id <> auth.uid()
    AND m.created_at > COALESCE(cm.last_read_at, 'epoch'::timestamptz)
  GROUP BY m.chat_id;
$$;

GRANT EXECUTE ON FUNCTION get_unread_counts() TO authenticated;
