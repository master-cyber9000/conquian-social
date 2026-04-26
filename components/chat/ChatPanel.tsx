'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
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
  localPlayerId?: string;
}

interface Toast {
  id: string;
  avatar: string;
  displayName: string;
  content: string;
}

export default function ChatPanel({
  messages,
  onSendMessage,
  pot,
  betAmount,
  spectators,
  isCollapsed = false,
  onToggle,
  localPlayerId,
}: ChatPanelProps) {
  const { lang } = useLanguage();
  const [input, setInput] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessageCount = useRef(messages.length);
  const isCollapsedRef = useRef(isCollapsed);

  // Keep ref in sync with prop (to avoid stale closure in effect)
  useEffect(() => {
    isCollapsedRef.current = isCollapsed;
  }, [isCollapsed]);

  // Reset unread when panel opens
  useEffect(() => {
    if (!isCollapsed) {
      setUnreadCount(0);
    }
  }, [isCollapsed]);

  // Detect new incoming messages
  useEffect(() => {
    const newCount = messages.length - prevMessageCount.current;
    if (newCount <= 0) {
      prevMessageCount.current = messages.length;
      return;
    }

    const newMessages = messages.slice(prevMessageCount.current);
    prevMessageCount.current = messages.length;

    // Filter out messages from the local player
    const incoming = newMessages.filter((m) => m.player_id !== localPlayerId);
    if (incoming.length === 0) return;

    if (isCollapsedRef.current) {
      // Increment unread badge
      setUnreadCount((c) => c + incoming.length);

      // Show a toast for the latest incoming message
      const latest = incoming[incoming.length - 1];
      const toast: Toast = {
        id: latest.id,
        avatar: latest.avatar,
        displayName: latest.display_name,
        content: latest.content,
      };
      setToasts((prev) => [...prev, toast]);

      // Auto-dismiss after 4 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, 4000);
    }
  }, [messages, localPlayerId]);

  // Scroll to bottom when panel is open and messages change
  useEffect(() => {
    if (!isCollapsed) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isCollapsed]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <>
      {/* ── Toast notifications (visible when chat is closed) ── */}
      {isCollapsed && toasts.length > 0 && (
        <div className="fixed right-4 bottom-24 z-40 flex flex-col gap-2 items-end pointer-events-none"
          style={{ marginBottom: '4rem' }}>
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="pointer-events-auto flex items-start gap-2.5 bg-[#1c1c1c] border border-[#383838] rounded-2xl px-3.5 py-2.5 shadow-2xl max-w-[220px] animate-slide-up"
              onClick={() => { dismissToast(toast.id); onToggle?.(); }}
              style={{ cursor: 'pointer' }}
            >
              <span className="text-xl flex-shrink-0 mt-0.5">{toast.avatar}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-amber-400 truncate">{toast.displayName}</p>
                <p className="text-xs text-gray-300 line-clamp-2 mt-0.5">{toast.content}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); dismissToast(toast.id); }}
                className="text-gray-600 hover:text-gray-400 flex-shrink-0 mt-0.5"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Collapsed toggle button with unread badge ── */}
      {isCollapsed && (
        <button
          id="open-chat-btn"
          onClick={() => { setUnreadCount(0); onToggle?.(); }}
          className="fixed right-4 bottom-6 z-30 bg-[#1a1a1a] border border-[#333] rounded-full w-12 h-12 flex items-center justify-center hover:bg-[#222] transition-colors shadow-xl group"
          title={t('openChat', lang)}
        >
          {/* Chat icon */}
          <svg className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>

          {/* Unread badge */}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-lg animate-bounce-once">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      )}

      {/* ── Expanded panel ── */}
      {!isCollapsed && (
        <div className="fixed right-0 top-[57px] sm:top-[60px] bottom-0 w-full sm:w-72 bg-[#111]/95 sm:bg-[#111] backdrop-blur-md sm:backdrop-blur-none border-l border-[#2a2a2a] flex flex-col z-50 slide-in-right shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-[#2a2a2a] bg-[#0f0f0f]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                {t('chat', lang)}
              </span>
              {messages.length > 0 && (
                <span className="text-[10px] text-gray-600">
                  {messages.length} {lang === 'en' ? 'msg' : 'msg'}
                </span>
              )}
            </div>
            <button
              id="close-chat-btn"
              onClick={onToggle}
              className="text-gray-300 hover:text-white transition-colors p-2 sm:p-1.5 bg-gray-800/80 rounded-md ring-1 ring-white/10"
              title={t('closeChat', lang)}
            >
              <svg className="w-6 h-6 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
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

          {/* Spectators */}
          {spectators.length > 0 && (
            <div className="px-3 py-1.5 border-b border-[#2a2a2a] bg-[#0f0f0f]">
              <div className="text-[10px] text-gray-500 mb-1">{t('watching', lang)}</div>
              <div className="flex gap-1 flex-wrap">
                {spectators.map((s) => (
                  <div key={s.player_id}
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
            {messages.map((msg) => {
              const isOwn = msg.player_id === localPlayerId;
              return (
                <div key={msg.id} className={`flex gap-2 fade-in ${isOwn ? 'flex-row-reverse' : ''}`}>
                  {!isOwn && <span className="text-base flex-shrink-0 mt-0.5">{msg.avatar}</span>}
                  <div className={`flex flex-col gap-0.5 min-w-0 ${isOwn ? 'items-end' : ''}`}>
                    {!isOwn && (
                      <span className="text-[10px] text-gray-500">{msg.display_name}</span>
                    )}
                    <div className={`rounded-lg px-2.5 py-1.5 text-xs break-words ${
                      isOwn
                        ? 'bg-amber-900/60 text-amber-100'
                        : 'bg-[#1c1c1c] text-gray-200'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              );
            })}
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
      )}
    </>
  );
}
