-- BRO private beta. Run once in Supabase SQL Editor or with Supabase CLI.
create extension if not exists pgcrypto;
create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 name text not null default '', occupation text not null default '', about text not null default '',
 timezone text not null default 'America/New_York', onboarded boolean not null default false,
 proactive boolean not null default false, notifications boolean not null default false,
 frequency text not null default 'balanced' check (frequency in ('chill','balanced','chaotic')),
 quiet_hours boolean not null default true, quiet_start text not null default '23:00', quiet_end text not null default '08:00',
 last_checkin_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.goals (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 title text not null check (char_length(title) between 1 and 200), done boolean not null default false, created_at timestamptz not null default now()
);
create table if not exists public.conversations (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 title text not null default 'New chat', created_at timestamptz not null default now()
);
create table if not exists public.messages (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 conversation_id uuid not null references public.conversations(id) on delete cascade,
 role text not null check (role in ('user','assistant')), content text not null check (char_length(content) between 1 and 12000),
 source text not null default 'chat' check (source in ('chat','proactive','welcome')), created_at timestamptz not null default now()
);
create index if not exists goals_user_idx on public.goals(user_id,created_at);
create index if not exists conversations_user_idx on public.conversations(user_id,created_at desc);
create index if not exists messages_conversation_idx on public.messages(conversation_id,created_at);
create index if not exists messages_user_idx on public.messages(user_id,created_at desc);
alter table public.profiles enable row level security;
alter table public.goals enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
create policy "profiles owner" on public.profiles for all to authenticated using (id=auth.uid()) with check (id=auth.uid());
create policy "goals owner" on public.goals for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy "conversations owner" on public.conversations for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy "messages owner read" on public.messages for select to authenticated using (user_id=auth.uid());
-- All message writes happen in authenticated Edge Functions with server credentials.
create or replace function public.claim_bro_checkin(p_user_id uuid,p_minutes integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare claimed_id uuid;
begin
 if p_minutes < 30 or p_minutes > 1440 then return false; end if;
 update public.profiles set last_checkin_at=now()
 where id=p_user_id and onboarded=true and proactive=true and notifications=true
 and (last_checkin_at is null or last_checkin_at < now()-make_interval(mins=>p_minutes))
 returning id into claimed_id;
 return claimed_id is not null;
end $$;
revoke all on function public.claim_bro_checkin(uuid,integer) from public,anon,authenticated;
grant execute on function public.claim_bro_checkin(uuid,integer) to service_role;
