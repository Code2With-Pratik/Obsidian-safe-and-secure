-- =====================================================================
-- Obsidian — paste-and-run SQL for the four pending migrations.
-- Open https://supabase.com/dashboard/project/<your-ref>/sql/new and paste
-- this whole file in. Re-runnable: every statement is `IF NOT EXISTS` or
-- `OR REPLACE` so applying twice is harmless.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1.  Chat full-ecosystem (chat_members prefs + messages.client_id +
--     realtime publication).
-- ---------------------------------------------------------------------
ALTER TABLE chat_members
  ADD COLUMN IF NOT EXISTS pinned   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS muted    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS favorite BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS client_id UUID;

CREATE INDEX IF NOT EXISTS messages_client_id_idx
  ON messages (client_id)
  WHERE client_id IS NOT NULL;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['message_reactions', 'chats', 'chat_members']
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;

ALTER TABLE message_reactions REPLICA IDENTITY FULL;
ALTER TABLE chat_members      REPLICA IDENTITY FULL;

-- ---------------------------------------------------------------------
-- 2.  Blocked users.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS blocked_users (
  blocker_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

CREATE INDEX IF NOT EXISTS blocked_users_blocked_idx ON blocked_users(blocked_id);

ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "blocked_users_select_own" ON blocked_users;
CREATE POLICY "blocked_users_select_own" ON blocked_users
  FOR SELECT TO authenticated
  USING (blocker_id = auth.uid());

DROP POLICY IF EXISTS "blocked_users_modify_own" ON blocked_users;
CREATE POLICY "blocked_users_modify_own" ON blocked_users
  FOR ALL TO authenticated
  USING (blocker_id = auth.uid())
  WITH CHECK (blocker_id = auth.uid());

-- ---------------------------------------------------------------------
-- 3.  Unread counts RPC — returns one row per chat with the number of
--     messages newer than the caller's last_read_at and not authored by
--     them. Used by fetchChats() so the unread badge is correct on reload.
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- 4.  Shared per-chat theme — both participants see the same theme picked
--     by either side. Stored on the chats row so the existing chats
--     realtime channel broadcasts the change.
-- ---------------------------------------------------------------------
ALTER TABLE chats
  ADD COLUMN IF NOT EXISTS theme     TEXT,
  ADD COLUMN IF NOT EXISTS custom_bg TEXT;

ALTER TABLE chats REPLICA IDENTITY FULL;

-- ---------------------------------------------------------------------
-- 5.  Per-user soft-hide ("Delete for me") + scheduled messages
--     (status='scheduled' + schedule_at, delivered by pg_cron).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS message_hidden_for (
  message_id  UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  hidden_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS message_hidden_for_user_idx
  ON message_hidden_for(user_id);

ALTER TABLE message_hidden_for ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "msg_hidden_select_own" ON message_hidden_for;
CREATE POLICY "msg_hidden_select_own" ON message_hidden_for
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "msg_hidden_modify_own" ON message_hidden_for;
CREATE POLICY "msg_hidden_modify_own" ON message_hidden_for
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS schedule_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS messages_schedule_at_idx
  ON messages(schedule_at)
  WHERE schedule_at IS NOT NULL;

-- pg_cron extension (pre-installed on Supabase, this just enables it).
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

DO $$
BEGIN
  PERFORM cron.unschedule('deliver-scheduled-messages')
  WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'deliver-scheduled-messages'
  );
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'deliver-scheduled-messages',
  '* * * * *',
  $job$
    UPDATE messages
    SET status = 'sent', schedule_at = NULL
    WHERE status = 'scheduled'
      AND schedule_at IS NOT NULL
      AND schedule_at <= NOW();
  $job$
);

-- ---------------------------------------------------------------------
-- 6.  profiles.last_seen_at — drives "last seen at HH:mm" in DM headers.
-- ---------------------------------------------------------------------
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS profiles_last_seen_at_idx
  ON profiles(last_seen_at);

-- Done. Reload the app — the new columns/RPC/policies/jobs are now live.
