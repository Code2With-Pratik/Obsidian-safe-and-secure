-- Chats table
create table chats (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_by uuid references auth.users(id) on delete set null,
  type text not null check (type in ('dm', 'group', 'ghost', 'secret', 'channel')),
  name text,
  avatar text,
  banner text,
  description text,
  metadata jsonb default '{}'::jsonb
);

-- Chat members (many-to-many)
create table chat_members (
  chat_id uuid references chats(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  role text default 'member' check (role in ('owner', 'admin', 'member')),
  last_read_at timestamp with time zone default timezone('utc'::text, now()),
  primary key (chat_id, user_id)
);

-- Messages
create table messages (
  id uuid default gen_random_uuid() primary key,
  chat_id uuid references chats(id) on delete cascade not null,
  author_id uuid references auth.users(id) on delete set null not null,
  kind text not null check (kind in ('text', 'image', 'video', 'audio', 'voice', 'file', 'link', 'system', 'call', 'sticker', 'gif', 'poll', 'contact', 'location', 'schedule')),
  content text,
  payload jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone,
  reply_to uuid references messages(id) on delete set null,
  pinned boolean default false
);

-- Message Reactions
create table message_reactions (
  id uuid default gen_random_uuid() primary key,
  message_id uuid references messages(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  emoji text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(message_id, user_id, emoji)
);

-- Poll Votes
create table poll_votes (
  id uuid default gen_random_uuid() primary key,
  message_id uuid references messages(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  option_id text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(message_id, user_id, option_id)
);

-- Stories
create table stories (
  id uuid default gen_random_uuid() primary key,
  author_id uuid references auth.users(id) on delete cascade not null,
  type text not null check (type in ('image', 'video', 'text')),
  content_url text, -- preview or full content depending on type
  bg_gradient text, -- for text stories
  text_content text, -- for text stories
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  expires_at timestamp with time zone default (timezone('utc'::text, now()) + interval '24 hours') not null
);

-- Story Views
create table story_views (
  story_id uuid references stories(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  viewed_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (story_id, user_id)
);

-- Vault Files
create table vault_files (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  size bigint not null,
  type text not null,
  preview_url text,
  storage_path text not null,
  is_vault boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone
);

-- Enable RLS
alter table chats enable row level security;
alter table chat_members enable row level security;
alter table messages enable row level security;
alter table message_reactions enable row level security;
alter table poll_votes enable row level security;
alter table stories enable row level security;
alter table story_views enable row level security;
alter table vault_files enable row level security;

-- Policies

-- Chats: Viewable if you are a member
create policy "Chats viewable by members" on chats
  for select using (
    exists (
      select 1 from chat_members 
      where chat_id = id and user_id = auth.uid()
    )
  );

-- Chat Members: Viewable by members of the same chat
create policy "Chat members viewable by members" on chat_members
  for select using (
    exists (
      select 1 from chat_members as m
      where m.chat_id = chat_id and m.user_id = auth.uid()
    )
  );

-- Messages: Viewable if you are a member of the chat
create policy "Messages viewable by members" on messages
  for select using (
    exists (
      select 1 from chat_members 
      where chat_id = messages.chat_id and user_id = auth.uid()
    )
  );

create policy "Users can insert messages to chats they are in" on messages
  for insert with check (
    exists (
      select 1 from chat_members 
      where chat_id = messages.chat_id and user_id = auth.uid()
    )
  );

-- Reactions and Poll Votes: Viewable if you can see the message
create policy "Reactions viewable by chat members" on message_reactions
  for select using (
    exists (
      select 1 from messages m
      join chat_members cm on m.chat_id = cm.chat_id
      where m.id = message_id and cm.user_id = auth.uid()
    )
  );

create policy "Users can toggle reactions" on message_reactions
  for all using (auth.uid() = user_id);

create policy "Users can vote in polls" on poll_votes
  for all using (auth.uid() = user_id);

-- Stories: Viewable by everyone (for now, can restrict later)
create policy "Stories viewable by everyone" on stories
  for select using (true);

create policy "Users can manage their own stories" on stories
  for all using (auth.uid() = author_id);

-- Vault Files: Private to user
create policy "Vault files are private" on vault_files
  for all using (auth.uid() = user_id);

-- Create storage buckets
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);
insert into storage.buckets (id, name, public) values ('chat-media', 'chat-media', true);
insert into storage.buckets (id, name, public) values ('stories', 'stories', true);
insert into storage.buckets (id, name, public) values ('vault', 'vault', false);

-- Storage Policies
create policy "Avatar images are publicly accessible" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "Users can upload their own avatar" on storage.objects
  for insert with check (bucket_id = 'avatars' and auth.uid() = (storage.foldername(name))[1]::uuid);

create policy "Chat media is publicly accessible" on storage.objects
  for select using (bucket_id = 'chat-media');

create policy "Users can upload chat media" on storage.objects
  for insert with check (bucket_id = 'chat-media');

create policy "Story media is publicly accessible" on storage.objects
  for select using (bucket_id = 'stories');

create policy "Users can upload story media" on storage.objects
  for insert with check (bucket_id = 'stories' and auth.uid() = (storage.foldername(name))[1]::uuid);

create policy "Vault files are private to user" on storage.objects
  for all using (bucket_id = 'vault' and auth.uid() = (storage.foldername(name))[1]::uuid);
