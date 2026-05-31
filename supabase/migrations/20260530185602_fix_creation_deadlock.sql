-- Fix the "Catch-22" where a user can't see the chat they just created 
-- because they aren't a member yet.

drop policy if exists "Chats viewable by members" on chats;

create policy "Chats viewable by members or creator" on chats
  for select using (
    created_by = auth.uid() OR
    exists (
      select 1 from chat_members 
      where chat_id = id and user_id = auth.uid()
    )
  );

-- Also ensure members can always see their own memberships
drop policy if exists "Chat members viewable by members" on chat_members;

create policy "Chat members viewable by everyone" on chat_members
  for select using (auth.role() = 'authenticated');
