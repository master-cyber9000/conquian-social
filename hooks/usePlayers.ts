'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase, Player } from '@/lib/supabase';

export function usePlayers(roomCode: string) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!roomCode) return;

    const fetchPlayers = async () => {
      const { data } = await supabase
        .from('players')
        .select('*')
        .eq('room_code', roomCode)
        .order('seat_number', { ascending: true });
      if (data) setPlayers(data as Player[]);
      setLoading(false);
    };

    fetchPlayers();

    channelRef.current = supabase
      .channel(`players_${roomCode}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players',
          filter: `room_code=eq.${roomCode}`,
        },
        () => fetchPlayers()
      )
      .subscribe();

    return () => {
      channelRef.current?.unsubscribe();
    };
  }, [roomCode]);

  const updatePlayer = async (playerId: string, updates: Partial<Player>) => {
    const { error } = await supabase
      .from('players')
      .update(updates)
      .eq('player_id', playerId)
      .eq('room_code', roomCode);
    return error;
  };

  const activePlayers = players.filter((p) => !p.is_spectator).sort((a, b) => (a.seat_number ?? 0) - (b.seat_number ?? 0));
  const spectators = players.filter((p) => p.is_spectator);

  return { players, activePlayers, spectators, loading, updatePlayer };
}
