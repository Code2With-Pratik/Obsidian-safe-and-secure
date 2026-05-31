-- Add a helper to find an existing DM between two users
create or replace function find_dm_between_users(user1_id uuid, user2_id uuid)
returns uuid as $$
declare
  found_chat_id uuid;
begin
  select cm1.chat_id into found_chat_id
  from chat_members cm1
  join chat_members cm2 on cm1.chat_id = cm2.chat_id
  join chats c on c.id = cm1.chat_id
  where c.type = 'dm'
    and cm1.user_id = user1_id
    and cm2.user_id = user2_id
  limit 1;
  
  return found_chat_id;
end;
$$ language plpgsql security definer;
