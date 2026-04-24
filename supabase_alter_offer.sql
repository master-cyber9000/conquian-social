-- Add columns to support timed discard offers with priority resolution
-- Run this in your Supabase SQL Editor

alter table game_state
  add column if not exists offer_deadline bigint,          -- unix ms timestamp
  add column if not exists discard_claims jsonb default '{}',  -- { playerId: claimTimestamp }
  add column if not exists pending_claim_card jsonb,      -- card waiting for winner to pick up
  add column if not exists last_discard_by text;          -- excluded from claiming their own discard
