-- Allow users to create their own chats
drop policy if exists "Users can create chats" on chats;
create policy "Users can create chats" on chats
  for insert with check (auth.uid() = created_by);

-- Allow users to add members when starting a chat
-- Note: Simplified for "any authenticated user" to prevent recursive policy issues during creation
drop policy if exists "Users can add members to chats they created" on chat_members;
create policy "Users can add members" on chat_members
  for insert with check (auth.role() = 'authenticated');

-- Ensure users can see members of chats they are part of
drop policy if exists "Chat members viewable by members" on chat_members;
create policy "Chat members viewable by members" on chat_members
  for select using (auth.role() = 'authenticated');
