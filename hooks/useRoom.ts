'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase, Room } from '@/lib/supabase';

export function useRoom(roomCode: string) {
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!roomCode) return;

    supabase
      .from('rooms')
      .select('*')
      .eq('code', roomCode)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setNotFound(true);
        } else {
          setRoom(data as Room);
        }
        setLoading(false);
      });

    channelRef.current = supabase
      .channel(`room_${roomCode}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rooms',
          filter: `code=eq.${roomCode}`,
        },
        (payload) => {
          if (payload.new) setRoom(payload.new as Room);
        }
      )
      .subscribe();

    return () => {
      channelRef.current?.unsubscribe();
    };
  }, [roomCode]);

  const updateRoom = async (updates: Partial<Room>) => {
    const { error } = await supabase.from('rooms').update(updates).eq('code', roomCode);
    return error;
  };

  return { room, loading, notFound, updateRoom };
}
