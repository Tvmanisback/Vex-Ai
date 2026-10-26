-- VEX AI profile table and safe username constraints.
-- Supabase Auth stores password hashes; never create your own password column.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint username_format check (username ~ '^[A-Za-z0-9_]{3,24}$')
);

alter table public.profiles enable row level security;

-- Users may read their own profile only. Profile creation/updates happen through
-- the trusted auth trigger, not direct client inserts.
create policy "Users can read their own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_username text;
  email_prefix text;
  safe_username text;
begin
  requested_username := new.raw_user_meta_data ->> 'username';
  email_prefix := split_part(coalesce(new.email, 'vexuser'), '@', 1);
  safe_username := coalesce(nullif(requested_username, ''), email_prefix);
  safe_username := regexp_replace(safe_username, '[^A-Za-z0-9_]', '', 'g');

  if length(safe_username) < 3 then
    safe_username := 'vex_' || substr(replace(new.id::text, '-', ''), 1, 8);
  end if;
  safe_username := substr(safe_username, 1, 24);

  -- Avoid signup failures for duplicate usernames created via OAuth.
  if exists (select 1 from public.profiles p where lower(p.username) = lower(safe_username)) then
    safe_username := substr(safe_username, 1, 15) || '_' || substr(replace(new.id::text, '-', ''), 1, 8);
  end if;

  insert into public.profiles (id, username)
  values (new.id, safe_username)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute procedure public.create_profile_for_new_user();

-- Prevent users from changing username to someone else's username.
-- Add future profile fields with explicit RLS policies rather than opening the table.
