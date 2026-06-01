-- Chat ecosystem: per-member preferences, client-id dedupe, broaden realtime
-- publications, helper RPCs.
--
-- Apply with `supabase db push` (or paste into the SQL editor on staging first).

-- ---------------------------------------------------------------------------
-- 1. Per-member chat preferences (pin / mute / favorite) so they survive
--    refresh and stay per-user.
-- ---------------------------------------------------------------------------
ALTER TABLE chat_members
  ADD COLUMN IF NOT EXISTS pinned   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS muted    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS favorite BOOLEAN NOT NULL DEFAULT false;

-- ---------------------------------------------------------------------------
-- 2. Deterministic optimistic-vs-realtime echo dedupe on messages.
--    The client generates a uuid and INSERTs it; the realtime echo carries
--    the same uuid, so we can swap the temp row in state without ambiguity.
-- ---------------------------------------------------------------------------
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS client_id UUID;

CREATE INDEX IF NOT EXISTS messages_client_id_idx
  ON messages (client_id)
  WHERE client_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. Add the reaction / chat / chat_members tables to the realtime
--    publication so the client gets live updates for them too. (Safe to
--    re-run thanks to the dynamic check.)
-- ---------------------------------------------------------------------------
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

-- Full row in payloads (so we have user_id + emoji on DELETE events).
ALTER TABLE message_reactions REPLICA IDENTITY FULL;
ALTER TABLE chat_members      REPLICA IDENTITY FULL;
