'use client';

import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { t } from '@/lib/i18n';
import { Message, Player } from '@/lib/supabase';

interface ChatPanelProps {
  messages: Message[];
  onSendMessage: (content: string) => void;
  pot: number;
  betAmount: number;
  spectators: Player[];
  isCollapsed?: boolean;
  onToggle?: () => void;
}

export default function ChatPanel({
  messages,
  onSendMessage,
  pot,
  betAmount,
  spectators,
  isCollapsed = false,
  onToggle,
}: ChatPanelProps) {
  const { lang } = useLanguage();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSendMessage(input.trim());
    setInput('');
  };

  if (isCollapsed) {
    return (
      <button
        id="open-chat-btn"
        onClick={onToggle}
        className="fixed right-4 bottom-24 z-30 bg-[#1a1a1a] border border-[#333] rounded-full w-12 h-12 flex items-center justify-center hover:bg-[#222] transition-colors shadow-xl"
        title={t('openChat', lang)}
      >
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed right-0 top-[57px] bottom-0 w-72 bg-[#111] border-l border-[#2a2a2a] flex flex-col z-30 slide-in-right">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#2a2a2a] bg-[#0f0f0f]">
        <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">
          {t('chat', lang)}
        </span>
        <button
          id="close-chat-btn"
          onClick={onToggle}
          className="text-gray-500 hover:text-white transition-colors"
          title={t('closeChat', lang)}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Pinned pot info */}
      <div className="flex justify-around px-3 py-2 bg-[#161616] border-b border-[#2a2a2a]">
        <div className="text-center">
          <div className="text-[10px] text-gray-500 uppercase">{t('pot', lang)}</div>
          <div className="text-sm font-bold text-amber-400">${pot.toFixed(2)}</div>
        </div>
        <div className="w-px bg-[#2a2a2a]" />
        <div className="text-center">
          <div className="text-[10px] text-gray-500 uppercase">{t('betAmount', lang)}</div>
          <div className="text-sm font-bold text-white">${betAmount.toFixed(2)}</div>
        </div>
      </div>

      {/* Spectators watching */}
      {spectators.length > 0 && (
        <div className="px-3 py-1.5 border-b border-[#2a2a2a] bg-[#0f0f0f]">
          <div className="text-[10px] text-gray-500 mb-1">{t('watching', lang)}</div>
          <div className="flex gap-1 flex-wrap">
            {spectators.map((s) => (
              <div
                key={s.player_id}
                className="flex items-center gap-1 bg-[#1a1a1a] rounded-full px-1.5 py-0.5"
                title={s.display_name}
              >
                <span className="text-xs">{s.avatar}</span>
                <span className="text-[10px] text-gray-400 truncate max-w-[50px]">{s.display_name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {messages.length === 0 && (
          <p className="text-center text-gray-600 text-xs mt-4">
            {lang === 'en' ? 'No messages yet' : 'Sin mensajes aún'}
          </p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className="flex gap-2 fade-in">
            <span className="text-base flex-shrink-0 mt-0.5">{msg.avatar}</span>
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-[10px] text-gray-500">{msg.display_name}</span>
              <div className="bg-[#1c1c1c] rounded-lg px-2.5 py-1.5 text-xs text-gray-200 break-words">
                {msg.content}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[#2a2a2a] p-2 flex gap-2">
        <input
          id="chat-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
          placeholder={t('chatPlaceholder', lang)}
          maxLength={200}
          className="flex-1 bg-[#1c1c1c] border border-[#333] rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-600"
        />
        <button
          id="send-chat-btn"
          onClick={handleSend}
          disabled={!input.trim()}
          className="bg-amber-700 hover:bg-amber-600 disabled:opacity-40 text-white rounded-lg px-3 py-1.5 text-xs font-bold transition-colors"
        >
          {t('send', lang)}
        </button>
      </div>
    </div>
  );
}
