-- Enable Realtime for relevant tables
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table chat_members;
alter publication supabase_realtime add table profiles;

-- Add a helper function to get the other user's profile for a DM chat
create or replace function get_other_member_profile(p_chat_id uuid)
returns setof profiles as $$
begin
  return query
  select p.*
  from profiles p
  join chat_members cm on cm.user_id = p.id
  where cm.chat_id = p_chat_id
    and cm.user_id != auth.uid()
  limit 1;
end;
$$ language plpgsql security definer;
