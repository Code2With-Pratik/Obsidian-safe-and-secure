-- Fix missing INSERT policies for chats
create policy "Users can create chats" on chats
  for insert with check (auth.uid() = created_by);

-- Fix missing INSERT policies for chat_members
create policy "Users can add members to chats they created" on chat_members
  for insert with check (
    exists (
      select 1 from chats
      where id = chat_id and created_by = auth.uid()
    )
  );

-- Fix recursive policy for chat_members select
drop policy if exists "Chat members viewable by members" on chat_members;
create policy "Chat members viewable by members" on chat_members
  for select using (auth.role() = 'authenticated');

-- Fix recursive policy for chats select
drop policy if exists "Chats viewable by members" on chats;
create policy "Chats viewable by members" on chats
  for select using (
    exists (
      select 1 from chat_members 
      where chat_id = id and user_id = auth.uid()
    )
  );
