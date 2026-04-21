-- ============================================================
-- Conquian Social — Supabase Schema
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- Then enable Realtime on all 4 tables:
--   Database → Replication → enable rooms, players, game_state, messages
-- ============================================================

create table if not exists rooms (
  code text primary key,
  host_id text not null,
  status text default 'lobby',
  pot numeric default 0,
  bet_amount numeric default 0,
  created_at timestamp default now()
);

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  room_code text references rooms(code) on delete cascade,
  player_id text not null,
  display_name text not null,
  avatar text not null,
  border_color text not null default 'gold',
  seat_number int,
  is_spectator boolean default false,
  balance numeric default 10.00,
  is_ready boolean default false,
  vote text,
  is_connected boolean default true,
  unique(room_code, player_id)
);

create table if not exists game_state (
  room_code text primary key references rooms(code) on delete cascade,
  deck jsonb default '[]',
  hands jsonb default '{}',
  melds jsonb default '{}',
  discard_pile jsonb default '[]',
  stock_pile jsonb default '[]',
  current_player_id text,
  turn_phase text default 'between_turns',
  round_number int default 1,
  meld_counts jsonb default '{}'
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  room_code text references rooms(code) on delete cascade,
  player_id text not null,
  display_name text not null,
  avatar text not null,
  content text not null,
  created_at timestamp default now()
);

-- Optional: auto-expire rooms after 24h of inactivity
-- (Run separately if needed)
-- create index rooms_created_at_idx on rooms(created_at);
