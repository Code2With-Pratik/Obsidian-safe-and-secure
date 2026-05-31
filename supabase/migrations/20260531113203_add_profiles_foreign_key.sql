-- Add explicit foreign key from chat_members to profiles
-- This allows PostgREST to automatically resolve joins between these tables
alter table public.chat_members
  drop constraint if exists chat_members_user_id_fkey,
  add constraint chat_members_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;

-- Note: profiles.id already references auth.users(id), so this maintains referential integrity.
