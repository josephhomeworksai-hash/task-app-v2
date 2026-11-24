-- HW5: GitHub accounts often have no display name, which left the profile name
-- empty. Use the GitHub user name, or the first part of the email, instead.
create or replace function public.handle_new_user()
returns trigger
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, name)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'name', ''),
      nullif(new.raw_user_meta_data->>'full_name', ''),
      nullif(new.raw_user_meta_data->>'user_name', ''),
      split_part(new.email, '@', 1)
    )
  );
  return new;
end;
$$ language plpgsql;

-- Fill in the name for profiles created before this change.
update public.profiles p
set name = coalesce(
  nullif(u.raw_user_meta_data->>'name', ''),
  nullif(u.raw_user_meta_data->>'full_name', ''),
  nullif(u.raw_user_meta_data->>'user_name', ''),
  split_part(u.email, '@', 1)
)
from auth.users u
where u.id = p.user_id
  and (p.name is null or p.name = '');
