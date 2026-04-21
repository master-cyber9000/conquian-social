'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase, Message } from '@/lib/supabase';

export function useChat(roomCode: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!roomCode) return;

    // Initial fetch
    supabase
      .from('messages')
      .select('*')
      .eq('room_code', roomCode)
      .order('created_at', { ascending: true })
      .limit(100)
      .then(({ data }) => {
        if (data) setMessages(data as Message[]);
      });

    channelRef.current = supabase
      .channel(`messages_${roomCode}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_code=eq.${roomCode}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      channelRef.current?.unsubscribe();
    };
  }, [roomCode]);

  const sendMessage = async (
    content: string,
    sender: { playerId: string; displayName: string; avatar: string }
  ) => {
    if (!content.trim()) return;
    const { error } = await supabase.from('messages').insert({
      room_code: roomCode,
      player_id: sender.playerId,
      display_name: sender.displayName,
      avatar: sender.avatar,
      content: content.trim(),
    });
    return error;
  };

  return { messages, sendMessage };
}
