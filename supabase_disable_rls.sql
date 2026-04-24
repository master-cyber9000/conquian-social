-- ============================================================
-- Conquian Social — Disable RLS for anonymous (no-auth) demo
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Disable Row Level Security on all 4 tables
alter table rooms disable row level security;
alter table players disable row level security;
alter table game_state disable row level security;
alter table messages disable row level security;

-- Also grant full access to anon and authenticated roles
-- (belt-and-suspenders for some Supabase plan configs)
grant all on rooms to anon, authenticated;
grant all on players to anon, authenticated;
grant all on game_state to anon, authenticated;
grant all on messages to anon, authenticated;

-- Confirm
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('rooms', 'players', 'game_state', 'messages');
