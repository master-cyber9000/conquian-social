'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase, GameState, CardType } from '@/lib/supabase';

// Fill in safe defaults for new columns that may not exist in older DB rows
function normalizeGameState(raw: unknown): GameState {
  const data = raw as Record<string, unknown>;
  return {
    ...data,
    offer_deadline: (data.offer_deadline as number | null) ?? null,
    discard_claims: (data.discard_claims as Record<string, number> | null) ?? {},
    pending_claim_card: (data.pending_claim_card as GameState['pending_claim_card'] | null) ?? null,
    last_discard_by: (data.last_discard_by as string | null) ?? null,
  } as GameState;
}

export function useGameState(roomCode: string) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!roomCode) return;

    // Initial fetch
    supabase
      .from('game_state')
      .select('*')
      .eq('room_code', roomCode)
      .single()
      .then(({ data }) => {
        if (data) setGameState(normalizeGameState(data));
        setLoading(false);
      });

    // Realtime subscription
    channelRef.current = supabase
      .channel(`game_state_${roomCode}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_state',
          filter: `room_code=eq.${roomCode}`,
        },
        (payload) => {
          if (payload.new) {
            setGameState(normalizeGameState(payload.new));
          }
        }
      )
      .subscribe();

    return () => {
      channelRef.current?.unsubscribe();
    };
  }, [roomCode]);

  const updateGameState = async (updates: Partial<GameState>) => {
    const { error } = await supabase
      .from('game_state')
      .update(updates as Record<string, unknown>)
      .eq('room_code', roomCode);
    return error;
  };

  const initGameState = async (state: GameState) => {
    const { error } = await supabase
      .from('game_state')
      .upsert(state as unknown as Record<string, unknown>);
    return error;
  };

  return { gameState, loading, updateGameState, initGameState };
}
