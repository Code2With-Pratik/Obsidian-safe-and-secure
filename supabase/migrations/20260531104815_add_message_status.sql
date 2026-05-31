-- Add status column to messages if it doesn't exist
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name='messages' and column_name='status') then
    alter table messages add column status text default 'sent';
  end if;
end $$;

-- Update RLS to allow updating message status (for read receipts)
create policy "Users can update message status in their chats" on messages
  for update using (
    exists (
      select 1 from chat_members 
      where chat_id = messages.chat_id and user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from chat_members 
      where chat_id = messages.chat_id and user_id = auth.uid()
    )
  );
