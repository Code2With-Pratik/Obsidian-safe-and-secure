-- Call sessions — one row per call (1:1 or group). The LiveKit room is
-- identified by `room_name`; ring / accept / decline / end events flow over
-- Supabase Realtime broadcast channels (no separate signaling server).
create table call_sessions (
  id            uuid default gen_random_uuid() primary key,
  chat_id       uuid references chats(id) on delete cascade not null,
  initiator_id  uuid references auth.users(id) on delete set null not null,
  room_name     text not null unique,
  kind          text not null check (kind in ('voice', 'video')),
  status        text not null default 'ringing'
                  check (status in ('ringing', 'active', 'ended', 'missed', 'rejected')),
  is_group      boolean default false,
  is_ghost      boolean default false,
  -- Users invited to the call (excluding initiator).
  participants  uuid[] default '{}'::uuid[] not null,
  -- Users who have actually accepted + joined the LiveKit room.
  joined        uuid[] default '{}'::uuid[] not null,
  -- Users who declined. Used to mark the call rejected once everyone declines.
  declined      uuid[] default '{}'::uuid[] not null,
  started_at    timestamptz default timezone('utc'::text, now()) not null,
  connected_at  timestamptz,
  ended_at      timestamptz,
  metadata      jsonb default '{}'::jsonb
);

alter table call_sessions enable row level security;

-- A chat member can see any call session in that chat.
create policy "call_sessions select by chat member" on call_sessions
  for select using (
    exists (
      select 1 from chat_members
      where chat_id = call_sessions.chat_id
        and user_id = auth.uid()
    )
  );

-- Only the initiator (and only if they're a chat member) can create a call.
create policy "call_sessions insert by chat member" on call_sessions
  for insert with check (
    auth.uid() = initiator_id
    and exists (
      select 1 from chat_members
      where chat_id = call_sessions.chat_id
        and user_id = auth.uid()
    )
  );

-- Any chat member can update (accept/decline/end). API routes enforce which
-- columns/transitions are valid; RLS just keeps strangers out.
create policy "call_sessions update by chat member" on call_sessions
  for update using (
    exists (
      select 1 from chat_members
      where chat_id = call_sessions.chat_id
        and user_id = auth.uid()
    )
  );

create index idx_call_sessions_chat_started on call_sessions (chat_id, started_at desc);
create index idx_call_sessions_live
  on call_sessions (chat_id)
  where status in ('ringing', 'active');

-- Realtime — broadcast row UPDATEs (status flips, joined/declined arrays) so
-- every participant's UI converges without polling. INSERTs also fan out as a
-- belt-and-braces fallback for the per-user ring broadcast.
alter publication supabase_realtime add table call_sessions;
alter table call_sessions replica identity full;
