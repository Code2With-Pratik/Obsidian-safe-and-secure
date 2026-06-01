-- Blocking: a user can block another user. Blocked users can't DM you and
-- their existing DMs are hidden from your chat list.

CREATE TABLE IF NOT EXISTS blocked_users (
  blocker_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

CREATE INDEX IF NOT EXISTS blocked_users_blocked_idx ON blocked_users(blocked_id);

ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

-- A user can see only their own block list.
DROP POLICY IF EXISTS "blocked_users_select_own" ON blocked_users;
CREATE POLICY "blocked_users_select_own" ON blocked_users
  FOR SELECT TO authenticated
  USING (blocker_id = auth.uid());

-- A user can insert / delete only their own block rows.
DROP POLICY IF EXISTS "blocked_users_modify_own" ON blocked_users;
CREATE POLICY "blocked_users_modify_own" ON blocked_users
  FOR ALL TO authenticated
  USING (blocker_id = auth.uid())
  WITH CHECK (blocker_id = auth.uid());
