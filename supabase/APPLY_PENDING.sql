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

-- ---------------------------------------------------------------------
-- 15. profiles.created_at — drives the "Joined" line in the chat-details
--     panel. Backfilled from auth.users.created_at where available; new
--     rows default to NOW().
-- ---------------------------------------------------------------------
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

UPDATE profiles p
   SET created_at = u.created_at
  FROM auth.users u
 WHERE p.id = u.id
   AND p.created_at IS DISTINCT FROM u.created_at
   AND u.created_at IS NOT NULL;

-- ---------------------------------------------------------------------
-- 16. Disappearing messages — chats.disappearing_seconds (NULL = off)
--     plus a pg_cron job that deletes every message older than the
--     window. Triggered by the "Disappearing messages" row in the chat
--     details panel; mirrors WhatsApp's behaviour.
-- ---------------------------------------------------------------------
ALTER TABLE chats
  ADD COLUMN IF NOT EXISTS disappearing_seconds INTEGER;

DO $$
BEGIN
  PERFORM cron.unschedule('cleanup-disappearing-messages')
  WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'cleanup-disappearing-messages'
  );
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'cleanup-disappearing-messages',
  '*/5 * * * *',
  $job$
    DELETE FROM messages m
     USING chats c
     WHERE m.chat_id = c.id
       AND c.disappearing_seconds IS NOT NULL
       AND c.disappearing_seconds > 0
       AND m.created_at < NOW() - (c.disappearing_seconds || ' seconds')::INTERVAL;
  $job$
);

-- ---------------------------------------------------------------------
-- 17. Communities ecosystem.
--
--     • communities          — one row per community. host_id locks
--                              posting + delete; everyone else can only
--                              join / react / poll-vote.
--     • community_members    — join table. last_seen_at drives the live
--                              "online" count (presence within 5 minutes).
--     • community_posts      — host-authored posts (text / image / video /
--                              song / poll). media/poll/song stored as
--                              JSONB so the columns stay narrow.
--     • community_reactions  — per-user emoji toggle per post.
--     • community_poll_votes — per-user vote per option (one vote allowed,
--                              switchable via UPSERT).
--     • community_covers     — public storage bucket for cover uploads.
--
--     RLS deny-by-default: everyone reads, only host writes posts,
--     members manage their own membership + reactions + votes.
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS communities (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  description  TEXT,
  cover        TEXT,
  category     TEXT,
  host_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  interests    TEXT[] DEFAULT '{}',
  theme        TEXT,
  verified     BOOLEAN DEFAULT false,
  trending     BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS communities_host_idx ON communities(host_id);
CREATE INDEX IF NOT EXISTS communities_created_idx ON communities(created_at DESC);

CREATE TABLE IF NOT EXISTS community_members (
  community_id  UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (community_id, user_id)
);

CREATE INDEX IF NOT EXISTS community_members_user_idx ON community_members(user_id);
CREATE INDEX IF NOT EXISTS community_members_seen_idx ON community_members(last_seen_at);

CREATE TABLE IF NOT EXISTS community_posts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id  UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  author_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind          TEXT NOT NULL CHECK (kind IN ('text','image','video','song','poll')),
  content       TEXT,
  media         JSONB,
  song          JSONB,
  poll          JSONB,
  mentions      UUID[] DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS community_posts_community_idx
  ON community_posts(community_id, created_at DESC);

CREATE TABLE IF NOT EXISTS community_reactions (
  post_id   UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji     TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS community_reactions_post_idx ON community_reactions(post_id);

CREATE TABLE IF NOT EXISTS community_poll_votes (
  post_id    UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  option_id  TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- One vote per user per post (re-voting switches the option via UPSERT).
  PRIMARY KEY (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS community_poll_votes_post_idx ON community_poll_votes(post_id);

ALTER TABLE communities          ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_members    ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_posts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_reactions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_poll_votes ENABLE ROW LEVEL SECURITY;

-- communities: everyone can browse, anyone authenticated can create
-- (host_id = auth.uid()), only host can update/delete.
DROP POLICY IF EXISTS communities_select_all ON communities;
CREATE POLICY communities_select_all
  ON communities FOR SELECT
  USING (true);

DROP POLICY IF EXISTS communities_insert_self ON communities;
CREATE POLICY communities_insert_self
  ON communities FOR INSERT
  WITH CHECK (host_id = auth.uid());

DROP POLICY IF EXISTS communities_update_host ON communities;
CREATE POLICY communities_update_host
  ON communities FOR UPDATE
  USING (host_id = auth.uid());

DROP POLICY IF EXISTS communities_delete_host ON communities;
CREATE POLICY communities_delete_host
  ON communities FOR DELETE
  USING (host_id = auth.uid());

-- community_members: everyone reads (counts are public), users insert/update
-- only their own row, delete only their own row (= leave community).
DROP POLICY IF EXISTS community_members_select_all ON community_members;
CREATE POLICY community_members_select_all
  ON community_members FOR SELECT
  USING (true);

DROP POLICY IF EXISTS community_members_insert_self ON community_members;
CREATE POLICY community_members_insert_self
  ON community_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS community_members_update_self ON community_members;
CREATE POLICY community_members_update_self
  ON community_members FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS community_members_delete_self ON community_members;
CREATE POLICY community_members_delete_self
  ON community_members FOR DELETE
  USING (user_id = auth.uid());

-- community_posts: everyone reads, ONLY the host of the community can
-- insert posts. Author can update / delete their own post (= host, since
-- they're the only one who can post).
DROP POLICY IF EXISTS community_posts_select_all ON community_posts;
CREATE POLICY community_posts_select_all
  ON community_posts FOR SELECT
  USING (true);

DROP POLICY IF EXISTS community_posts_insert_host ON community_posts;
CREATE POLICY community_posts_insert_host
  ON community_posts FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM communities c
       WHERE c.id = community_id AND c.host_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS community_posts_update_author ON community_posts;
CREATE POLICY community_posts_update_author
  ON community_posts FOR UPDATE
  USING (author_id = auth.uid());

DROP POLICY IF EXISTS community_posts_delete_author ON community_posts;
CREATE POLICY community_posts_delete_author
  ON community_posts FOR DELETE
  USING (author_id = auth.uid());

-- community_reactions: everyone reads counts, users insert/delete their
-- own reaction rows.
DROP POLICY IF EXISTS community_reactions_select_all ON community_reactions;
CREATE POLICY community_reactions_select_all
  ON community_reactions FOR SELECT
  USING (true);

DROP POLICY IF EXISTS community_reactions_insert_self ON community_reactions;
CREATE POLICY community_reactions_insert_self
  ON community_reactions FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS community_reactions_delete_self ON community_reactions;
CREATE POLICY community_reactions_delete_self
  ON community_reactions FOR DELETE
  USING (user_id = auth.uid());

-- community_poll_votes: everyone reads tallies, users INSERT/UPDATE their
-- own vote row (UPSERT to switch options).
DROP POLICY IF EXISTS community_poll_votes_select_all ON community_poll_votes;
CREATE POLICY community_poll_votes_select_all
  ON community_poll_votes FOR SELECT
  USING (true);

DROP POLICY IF EXISTS community_poll_votes_insert_self ON community_poll_votes;
CREATE POLICY community_poll_votes_insert_self
  ON community_poll_votes FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS community_poll_votes_update_self ON community_poll_votes;
CREATE POLICY community_poll_votes_update_self
  ON community_poll_votes FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS community_poll_votes_delete_self ON community_poll_votes;
CREATE POLICY community_poll_votes_delete_self
  ON community_poll_votes FOR DELETE
  USING (user_id = auth.uid());

-- Public storage bucket for community covers (3 MB images).
INSERT INTO storage.buckets (id, name, public)
VALUES ('community-covers', 'community-covers', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies — anyone reads, only authenticated users upload, the
-- uploading user owns + manages their own files.
DROP POLICY IF EXISTS community_covers_read ON storage.objects;
CREATE POLICY community_covers_read
  ON storage.objects FOR SELECT
  USING (bucket_id = 'community-covers');

DROP POLICY IF EXISTS community_covers_insert ON storage.objects;
CREATE POLICY community_covers_insert
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'community-covers'
    AND auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS community_covers_update ON storage.objects;
CREATE POLICY community_covers_update
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'community-covers' AND owner = auth.uid());

DROP POLICY IF EXISTS community_covers_delete ON storage.objects;
CREATE POLICY community_covers_delete
  ON storage.objects FOR DELETE
  USING (bucket_id = 'community-covers' AND owner = auth.uid());

-- Realtime — DELETE payloads carry the full row so client caches can
-- evict by primary key.
ALTER TABLE community_posts     REPLICA IDENTITY FULL;
ALTER TABLE community_reactions REPLICA IDENTITY FULL;
ALTER TABLE community_members   REPLICA IDENTITY FULL;

-- Extend the messages.kind CHECK constraint so the new shared-community
-- card (kind: "community") survives INSERT. The original migration
-- (20260530162755_create_chat_tables) listed only the 15 original kinds
-- and used Postgres' auto-named `messages_kind_check`; drop + recreate
-- with the same name so the schema stays clean.
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_kind_check;
ALTER TABLE messages
  ADD CONSTRAINT messages_kind_check
  CHECK (kind IN (
    'text', 'image', 'video', 'audio', 'voice', 'file', 'link', 'system',
    'call', 'sticker', 'gif', 'poll', 'contact', 'community', 'location',
    'schedule'
  ));

-- ---------------------------------------------------------------------
-- 18. Calls dashboard data model — extend `call_sessions` so it can also
--     hold scheduled (future-dated) calls, and add a `duration_seconds`
--     mirror so history queries don't have to compute deltas on every
--     read. Adds a pg_cron job that auto-rings scheduled calls when
--     their `scheduled_for` time arrives.
--
--     Also patches the messages.kind CHECK constraint (already includes
--     'call') for completeness, and adds an INSERT trigger that posts a
--     human-readable "call" system message into the chat each time a
--     call row flips to its final (ended / missed / rejected) status.
-- ---------------------------------------------------------------------

ALTER TABLE call_sessions
  ADD COLUMN IF NOT EXISTS scheduled_for     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS title             TEXT,
  ADD COLUMN IF NOT EXISTS duration_seconds  INTEGER;

-- Extend the status enum to include 'scheduled' — needed for the
-- auto-ring cron to find pending calls. Drop + recreate the CHECK with
-- the same auto-name PostgREST inferred originally.
ALTER TABLE call_sessions DROP CONSTRAINT IF EXISTS call_sessions_status_check;
ALTER TABLE call_sessions
  ADD CONSTRAINT call_sessions_status_check
  CHECK (status IN (
    'scheduled', 'ringing', 'active', 'ended', 'missed', 'rejected'
  ));

CREATE INDEX IF NOT EXISTS call_sessions_scheduled_idx
  ON call_sessions(scheduled_for)
  WHERE status = 'scheduled';

-- pg_cron: every minute, find scheduled calls whose start time has
-- passed and flip them to 'ringing' so the existing realtime ring path
-- (clients subscribe to call_sessions row updates) fires automatically.
DO $$
BEGIN
  PERFORM cron.unschedule('start-scheduled-calls')
  WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'start-scheduled-calls'
  );
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'start-scheduled-calls',
  '* * * * *',
  $job$
    UPDATE call_sessions
       SET status = 'ringing',
           started_at = NOW()
     WHERE status = 'scheduled'
       AND scheduled_for IS NOT NULL
       AND scheduled_for <= NOW()
       AND ended_at IS NULL;
  $job$
);

-- ---------------------------------------------------------------------
-- 19. Ghost rooms — Discord-style anonymous voice + chat rooms.
--
--     • ghost_rooms          — one row per room. `pin` is null for public
--                              rooms, a 6-digit string for private. Real
--                              host_id stored for moderation only; never
--                              surfaced to peers (UI shows ghost handles).
--     • ghost_room_members   — join table. Each row carries the user's
--                              per-room ghost identity (handle, hue,
--                              avatar seed) so peers can render distinct
--                              anonymous tiles without knowing who's who.
--
--     RLS: rooms are publicly listable (everyone browses). Joins require
--     either is_locked=false OR a matching PIN (enforced in the API
--     route since RLS can't reach the request body). Members manage only
--     their own membership row.
--
--     A pg_cron job sweeps rooms past `expires_at` once per minute.
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ghost_rooms (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  topic        TEXT,
  pin          TEXT,
  is_locked    BOOLEAN NOT NULL DEFAULT false,
  capacity     INTEGER NOT NULL DEFAULT 40,
  aura         TEXT,
  hot          BOOLEAN DEFAULT false,
  host_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ghost_rooms_created_idx ON ghost_rooms(created_at DESC);
CREATE INDEX IF NOT EXISTS ghost_rooms_expires_idx ON ghost_rooms(expires_at)
  WHERE expires_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS ghost_room_members (
  room_id        UUID NOT NULL REFERENCES ghost_rooms(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ghost_handle   TEXT NOT NULL,
  ghost_hue      INTEGER NOT NULL DEFAULT 200,
  ghost_seed     TEXT NOT NULL DEFAULT '',
  joined_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (room_id, user_id)
);

CREATE INDEX IF NOT EXISTS ghost_room_members_room_idx ON ghost_room_members(room_id);

ALTER TABLE ghost_rooms        ENABLE ROW LEVEL SECURITY;
ALTER TABLE ghost_room_members ENABLE ROW LEVEL SECURITY;

-- ghost_rooms: everyone reads, any authenticated user can create
-- (host_id = auth.uid), only host can update/delete.
DROP POLICY IF EXISTS ghost_rooms_select_all ON ghost_rooms;
CREATE POLICY ghost_rooms_select_all
  ON ghost_rooms FOR SELECT
  USING (true);

DROP POLICY IF EXISTS ghost_rooms_insert_self ON ghost_rooms;
CREATE POLICY ghost_rooms_insert_self
  ON ghost_rooms FOR INSERT
  WITH CHECK (host_id = auth.uid());

DROP POLICY IF EXISTS ghost_rooms_update_host ON ghost_rooms;
CREATE POLICY ghost_rooms_update_host
  ON ghost_rooms FOR UPDATE
  USING (host_id = auth.uid());

DROP POLICY IF EXISTS ghost_rooms_delete_host ON ghost_rooms;
CREATE POLICY ghost_rooms_delete_host
  ON ghost_rooms FOR DELETE
  USING (host_id = auth.uid());

-- ghost_room_members: everyone reads (member counts + ghost handles are
-- public within the room), users insert/delete only their own row.
-- The /api/ghost-rooms/join endpoint enforces the PIN + capacity check
-- BEFORE the INSERT lands here.
DROP POLICY IF EXISTS ghost_room_members_select_all ON ghost_room_members;
CREATE POLICY ghost_room_members_select_all
  ON ghost_room_members FOR SELECT
  USING (true);

DROP POLICY IF EXISTS ghost_room_members_insert_self ON ghost_room_members;
CREATE POLICY ghost_room_members_insert_self
  ON ghost_room_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS ghost_room_members_delete_self ON ghost_room_members;
CREATE POLICY ghost_room_members_delete_self
  ON ghost_room_members FOR DELETE
  USING (user_id = auth.uid());

ALTER TABLE ghost_rooms        REPLICA IDENTITY FULL;
ALTER TABLE ghost_room_members REPLICA IDENTITY FULL;

-- pg_cron: every minute, evict rooms whose auto-close window has passed.
-- Cascades drop every membership row + any future related state.
DO $$
BEGIN
  PERFORM cron.unschedule('cleanup-expired-ghost-rooms')
  WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'cleanup-expired-ghost-rooms'
  );
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'cleanup-expired-ghost-rooms',
  '* * * * *',
  $job$
    DELETE FROM ghost_rooms
     WHERE expires_at IS NOT NULL
       AND expires_at <= NOW();
  $job$
);

-- ---------------------------------------------------------------------
-- 20. Whiteboards — Figma-style collaborative boards.
--
--     • whiteboards         — one row per board. Owner is the creator.
--                             `elements` holds the full element list as
--                             JSONB; `camera` holds {x,y,zoom}. Real-time
--                             cursor movement is handled via Supabase
--                             presence channels (no DB hop).
--     • whiteboard_members  — join table. `role` is 'owner' / 'editor' /
--                             'viewer'. Server-side RLS enforces that
--                             viewers can SELECT but not UPDATE shapes.
--
--     RLS:
--       • SELECT: owner, members, OR boards with visibility='link'
--                 (link-share rooms — anyone with the URL can read).
--       • INSERT: any authenticated user (host_id = auth.uid()).
--       • UPDATE: owner OR editor member (so shape saves go through).
--       • DELETE: owner only.
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS whiteboards (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  owner_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  elements     JSONB NOT NULL DEFAULT '[]'::jsonb,
  camera       JSONB NOT NULL DEFAULT '{"x":0,"y":0,"zoom":1}'::jsonb,
  visibility   TEXT NOT NULL DEFAULT 'private'
               CHECK (visibility IN ('private', 'team', 'link')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS whiteboards_owner_idx ON whiteboards(owner_id);
CREATE INDEX IF NOT EXISTS whiteboards_updated_idx ON whiteboards(updated_at DESC);

CREATE TABLE IF NOT EXISTS whiteboard_members (
  board_id    UUID NOT NULL REFERENCES whiteboards(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  added_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (board_id, user_id)
);

CREATE INDEX IF NOT EXISTS whiteboard_members_user_idx
  ON whiteboard_members(user_id);

ALTER TABLE whiteboards         ENABLE ROW LEVEL SECURITY;
ALTER TABLE whiteboard_members  ENABLE ROW LEVEL SECURITY;

-- whiteboards: owners + members can SELECT, plus anyone if visibility='link'.
DROP POLICY IF EXISTS whiteboards_select_member ON whiteboards;
CREATE POLICY whiteboards_select_member
  ON whiteboards FOR SELECT
  USING (
    visibility = 'link'
    OR owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM whiteboard_members m
       WHERE m.board_id = whiteboards.id AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS whiteboards_insert_self ON whiteboards;
CREATE POLICY whiteboards_insert_self
  ON whiteboards FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- UPDATE allowed for owner OR editor members. Viewers (and link-share
-- guests without a membership row) are silently rejected.
DROP POLICY IF EXISTS whiteboards_update_editor ON whiteboards;
CREATE POLICY whiteboards_update_editor
  ON whiteboards FOR UPDATE
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM whiteboard_members m
       WHERE m.board_id = whiteboards.id
         AND m.user_id = auth.uid()
         AND m.role IN ('owner', 'editor')
    )
  );

DROP POLICY IF EXISTS whiteboards_delete_owner ON whiteboards;
CREATE POLICY whiteboards_delete_owner
  ON whiteboards FOR DELETE
  USING (owner_id = auth.uid());

-- whiteboard_members: everyone in the board can SELECT (so the share
-- popover can list other members). Only the board owner can INSERT /
-- UPDATE / DELETE membership rows (= grant + revoke access).
DROP POLICY IF EXISTS whiteboard_members_select_member ON whiteboard_members;
CREATE POLICY whiteboard_members_select_member
  ON whiteboard_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM whiteboards b
       WHERE b.id = whiteboard_members.board_id
         AND (
           b.owner_id = auth.uid()
           OR EXISTS (
             SELECT 1 FROM whiteboard_members m2
              WHERE m2.board_id = b.id AND m2.user_id = auth.uid()
           )
         )
    )
  );

DROP POLICY IF EXISTS whiteboard_members_insert_owner ON whiteboard_members;
CREATE POLICY whiteboard_members_insert_owner
  ON whiteboard_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM whiteboards b
       WHERE b.id = whiteboard_members.board_id AND b.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS whiteboard_members_update_owner ON whiteboard_members;
CREATE POLICY whiteboard_members_update_owner
  ON whiteboard_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM whiteboards b
       WHERE b.id = whiteboard_members.board_id AND b.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS whiteboard_members_delete_owner ON whiteboard_members;
CREATE POLICY whiteboard_members_delete_owner
  ON whiteboard_members FOR DELETE
  USING (
    user_id = auth.uid() -- members can leave themselves
    OR EXISTS (
      SELECT 1 FROM whiteboards b
       WHERE b.id = whiteboard_members.board_id AND b.owner_id = auth.uid()
    )
  );

ALTER TABLE whiteboards        REPLICA IDENTITY FULL;
ALTER TABLE whiteboard_members REPLICA IDENTITY FULL;

-- ---------------------------------------------------------------------
-- 20a. Whiteboards — share-visibility hotfix (idempotent patch).
--
--     Three issues surfaced after section 20 shipped:
--
--     1) The original `whiteboard_members_select_member` policy was
--        recursive (it EXISTS-back into whiteboard_members). Postgres
--        throws "infinite recursion detected in policy" — which means
--        viewers / editors silently got zero membership rows back, and
--        the EXISTS clause in `whiteboards_select_member` collapsed, so
--        shared boards never appeared for the recipient.
--
--     2) `whiteboards` + `whiteboard_members` were never added to the
--        `supabase_realtime` publication. REPLICA IDENTITY FULL was set,
--        but without a publication entry the client's postgres_changes
--        channel subscribes successfully and receives nothing.
--
--     3) The membership UPDATE policy was missing — so flipping a user
--        from viewer to editor would silently RLS-fail under the upsert
--        path. INSERT worked, UPDATE didn't.
--
--     This block is re-runnable — every DROP IF EXISTS / publication
--     check is idempotent.
-- ---------------------------------------------------------------------

-- (1) Roster helper — SECURITY DEFINER bypasses RLS so the SELECT
-- policy can recurse into whiteboard_members WITHOUT triggering an
-- infinite policy loop. Restricted to authenticated callers; locked
-- search_path so the function is safe against schema-shadowing.
CREATE OR REPLACE FUNCTION is_whiteboard_member(_board UUID, _user UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM whiteboard_members
     WHERE board_id = _board AND user_id = _user
  );
$$;

REVOKE ALL ON FUNCTION is_whiteboard_member(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_whiteboard_member(UUID, UUID) TO authenticated;

-- Replace the recursive SELECT policy. The owner branch is direct;
-- the "any member sees the roster" branch goes through the SECURITY
-- DEFINER helper so it doesn't reapply RLS to itself.
DROP POLICY IF EXISTS whiteboard_members_select_member ON whiteboard_members;
CREATE POLICY whiteboard_members_select_member
  ON whiteboard_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM whiteboards b
       WHERE b.id = whiteboard_members.board_id
         AND (
           b.owner_id = auth.uid()
           OR is_whiteboard_member(b.id, auth.uid())
         )
    )
  );

-- (1b) The whiteboards SELECT policy EXISTS-into whiteboard_members; that
-- path is fine after the recursion fix, but also rewrite it to use the
-- helper for symmetry — same evaluation, future-proofed against further
-- policy edits.
DROP POLICY IF EXISTS whiteboards_select_member ON whiteboards;
CREATE POLICY whiteboards_select_member
  ON whiteboards FOR SELECT
  USING (
    visibility = 'link'
    OR owner_id = auth.uid()
    OR is_whiteboard_member(whiteboards.id, auth.uid())
  );

-- (2) Add to realtime publication so postgres_changes subscriptions on
-- the client actually receive INSERT/UPDATE/DELETE events. Skips
-- gracefully if already present.
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['whiteboards', 'whiteboard_members']
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

-- (3) Add the missing UPDATE policy so role-bumps (viewer→editor) via
-- upsert actually land. Mirrors the INSERT policy: only the board owner
-- can update membership rows.
DROP POLICY IF EXISTS whiteboard_members_update_owner ON whiteboard_members;
CREATE POLICY whiteboard_members_update_owner
  ON whiteboard_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM whiteboards b
       WHERE b.id = whiteboard_members.board_id AND b.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM whiteboards b
       WHERE b.id = whiteboard_members.board_id AND b.owner_id = auth.uid()
    )
  );

-- Done. Reload the app — the new columns/RPC/policies/jobs are now live.
