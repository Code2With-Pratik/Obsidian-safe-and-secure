create table if not exists public.device_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id text not null unique,
  access_token text not null,
  device_name text not null,
  browser text,
  platform text,
  location text,
  device_kind text not null default 'laptop',
  last_seen_at timestamptz not null default now()
);

create index if not exists device_sessions_user_id_idx
  on public.device_sessions (user_id, last_seen_at desc);

alter table public.device_sessions enable row level security;

create policy if not exists "Users can read own device sessions"
  on public.device_sessions
  for select
  using (auth.uid() = user_id);

create policy if not exists "Users can upsert own device sessions"
  on public.device_sessions
  for insert
  with check (auth.uid() = user_id);

create policy if not exists "Users can update own device sessions"
  on public.device_sessions
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy if not exists "Users can delete own device sessions"
  on public.device_sessions
  for delete
  using (auth.uid() = user_id);
