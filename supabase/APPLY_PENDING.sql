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

-- ---------------------------------------------------------------------
-- 7.  Allow message authors to delete their own messages ("Delete for
--     everyone"). Without this policy the original schema's RLS rejects
--     every DELETE silently and the row stays in the DB.
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can delete own messages" ON messages;
CREATE POLICY "Users can delete own messages" ON messages
  FOR DELETE TO authenticated
  USING (author_id = auth.uid());

-- Without REPLICA IDENTITY FULL on messages, realtime DELETE events carry
-- only the primary key — recipients can't route them to the right chat, so
-- "delete for everyone" only takes effect for the author.
ALTER TABLE messages REPLICA IDENTITY FULL;

-- ---------------------------------------------------------------------
-- 8.  Public Storage bucket for chat attachments (audio / images / video
--     / docs). Without this, files uploaded with URL.createObjectURL()
--     only exist in the sender's browser and the recipient sees a dead
--     blob: URL.
-- ---------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
  VALUES ('chat-attachments', 'chat-attachments', true)
  ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "chat_attachments_read" ON storage.objects;
CREATE POLICY "chat_attachments_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'chat-attachments');

DROP POLICY IF EXISTS "chat_attachments_upload" ON storage.objects;
CREATE POLICY "chat_attachments_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-attachments');

DROP POLICY IF EXISTS "chat_attachments_update" ON storage.objects;
CREATE POLICY "chat_attachments_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'chat-attachments' AND owner = auth.uid())
  WITH CHECK (bucket_id = 'chat-attachments' AND owner = auth.uid());

DROP POLICY IF EXISTS "chat_attachments_delete" ON storage.objects;
CREATE POLICY "chat_attachments_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'chat-attachments' AND owner = auth.uid());

-- ---------------------------------------------------------------------
-- 9.  Merge duplicate DM chats. Legacy rows (created before the
--     find_dm_between_users RPC existed) can leave 5–10 chat rows for the
--     same DM partner. This block picks the *oldest* chat per partner as
--     canonical, moves every duplicate's messages + reactions into it,
--     then deletes the duplicate rows. Safe to re-run — once everything
--     is deduped, the CTE returns no rows and nothing happens.
-- ---------------------------------------------------------------------
DO $$
DECLARE
  pair_record RECORD;
  canonical_id UUID;
BEGIN
  FOR pair_record IN
    SELECT
      LEAST(m1.user_id, m2.user_id) AS user_a,
      GREATEST(m1.user_id, m2.user_id) AS user_b,
      ARRAY_AGG(c.id ORDER BY c.created_at ASC) AS chat_ids
    FROM chats c
    JOIN chat_members m1 ON m1.chat_id = c.id
    JOIN chat_members m2 ON m2.chat_id = c.id AND m2.user_id <> m1.user_id
    WHERE c.type = 'dm'
    GROUP BY LEAST(m1.user_id, m2.user_id), GREATEST(m1.user_id, m2.user_id)
    HAVING COUNT(DISTINCT c.id) > 1
  LOOP
    canonical_id := pair_record.chat_ids[1];
    -- Re-point every duplicate's messages to the canonical chat. Reactions
    -- ride along through their message_id FK, no separate UPDATE needed.
    UPDATE messages
       SET chat_id = canonical_id
     WHERE chat_id = ANY(pair_record.chat_ids[2:array_length(pair_record.chat_ids, 1)]);
    -- Delete the duplicate chat rows; chat_members & cascades take care of
    -- the rest.
    DELETE FROM chats
     WHERE id = ANY(pair_record.chat_ids[2:array_length(pair_record.chat_ids, 1)]);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- 10. Stories ecosystem — likes table, metadata column, realtime
--     publication, and a pg_cron job that drops expired stories every
--     5 minutes (the stories table already carries `expires_at` set to
--     NOW() + 24h on insert).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS story_likes (
  story_id   UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (story_id, user_id)
);

CREATE INDEX IF NOT EXISTS story_likes_user_idx ON story_likes(user_id);

ALTER TABLE story_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "story_likes_select_all" ON story_likes;
CREATE POLICY "story_likes_select_all" ON story_likes
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "story_likes_modify_own" ON story_likes;
CREATE POLICY "story_likes_modify_own" ON story_likes
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Holds music/overlay metadata for slides composed in the editor.
ALTER TABLE stories
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Realtime publication so the viewer / sidebar update without a reload.
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['stories', 'story_views', 'story_likes']
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

ALTER TABLE stories REPLICA IDENTITY FULL;
ALTER TABLE story_views REPLICA IDENTITY FULL;
ALTER TABLE story_likes REPLICA IDENTITY FULL;

DO $$
BEGIN
  PERFORM cron.unschedule('cleanup-expired-stories')
  WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'cleanup-expired-stories'
  );
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'cleanup-expired-stories',
  '*/5 * * * *',
  $job$
    DELETE FROM stories WHERE expires_at <= NOW();
  $job$
);

-- ---------------------------------------------------------------------
-- 11. story_views RLS policies. The original schema enabled RLS on
--     story_views but never defined any policies, so every INSERT was
--     silently denied (RLS = deny-by-default). Without this, the
--     "Viewers" list always shows 0 even after people open the story.
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "story_views_select_all" ON story_views;
CREATE POLICY "story_views_select_all" ON story_views
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "story_views_insert_own" ON story_views;
CREATE POLICY "story_views_insert_own" ON story_views
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "story_views_delete_own" ON story_views;
CREATE POLICY "story_views_delete_own" ON story_views
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- 12. chat_members UPDATE + DELETE policies. The original schema only
--     defined SELECT + INSERT for chat_members, so every UPDATE of
--     pinned / muted / favorite / last_read_at was silently denied by
--     RLS — pin and "Add to favorites" appeared to work but reverted on
--     the next reload. Same for "Remove member" (DELETE).
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "chat_members_update_own" ON chat_members;
CREATE POLICY "chat_members_update_own" ON chat_members
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "chat_members_delete_own" ON chat_members;
CREATE POLICY "chat_members_delete_own" ON chat_members
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- 13. chats UPDATE + DELETE policies. The schema had SELECT + INSERT
--     only, so per-chat theme writes (UPDATE chats SET theme=…) were
--     silently denied by RLS — the picker looked like it worked but the
--     theme reverted on reload. Same gap blocked "Delete chat".
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "chats_update_by_members" ON chats;
CREATE POLICY "chats_update_by_members" ON chats
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_members
      WHERE chat_members.chat_id = chats.id
        AND chat_members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_members
      WHERE chat_members.chat_id = chats.id
        AND chat_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "chats_delete_by_members" ON chats;
CREATE POLICY "chats_delete_by_members" ON chats
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_members
      WHERE chat_members.chat_id = chats.id
        AND chat_members.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------
-- 14. WhatsApp-style block visibility — let users also SELECT rows
--     where they're the blocked party. Required so the client can
--     filter the blocker's presence + typing locally (the blocker
--     becomes invisible to the blocked user, same as WhatsApp). The
--     blocker still owns the row, so unblock semantics don't change.
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "blocked_users_select_own" ON blocked_users;
DROP POLICY IF EXISTS "blocked_users_select_own_or_blocked" ON blocked_users;
CREATE POLICY "blocked_users_select_own_or_blocked" ON blocked_users
  FOR SELECT TO authenticated
  USING (blocker_id = auth.uid() OR blocked_id = auth.uid());

-- Done. Reload the app — the new columns/RPC/policies/jobs are now live.
