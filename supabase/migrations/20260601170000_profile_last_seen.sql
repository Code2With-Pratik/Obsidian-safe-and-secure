-- Tracks when a user was last online — so DM chat headers can show
-- "last seen at HH:mm" when the other side is offline. Updated by the
-- client on presence join + every reconnect.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS profiles_last_seen_at_idx
  ON profiles(last_seen_at);
