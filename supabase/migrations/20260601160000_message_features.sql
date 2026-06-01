-- Two big message features:
--   1. Delete-for-me  → `message_hidden_for` table (per-user soft hide)
--   2. Scheduled send → `messages.schedule_at` + a pg_cron job that flips
--                       `status='scheduled'` rows to `status='sent'` at
--                       their `schedule_at` time, so recipients only see
--                       the message once it's actually due.

-- =====================================================================
-- 1.  Per-user hidden messages ("Delete for me")
-- =====================================================================
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

-- =====================================================================
-- 2.  Scheduled messages
-- =====================================================================
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS schedule_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS messages_schedule_at_idx
  ON messages(schedule_at)
  WHERE schedule_at IS NOT NULL;

-- pg_cron extension (pre-installed on Supabase; this just enables it).
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Idempotently (re)create the delivery job. Runs every minute and flips any
-- due 'scheduled' rows to 'sent' so the existing realtime UPDATE channel
-- delivers them to the recipients.
DO $$
BEGIN
  PERFORM cron.unschedule('deliver-scheduled-messages')
  WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'deliver-scheduled-messages'
  );
EXCEPTION WHEN OTHERS THEN
  -- The job didn't exist yet — that's fine.
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
