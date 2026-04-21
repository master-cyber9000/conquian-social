'use client';

import { useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { t } from '@/lib/i18n';
import LanguageToggle from './LanguageToggle';
import Button from '@/components/ui/Button';

interface TopBarProps {
  roomCode?: string;
  balance?: number;
  pot?: number;
  isMuted?: boolean;
  onMuteToggle?: () => void;
  isSpectator?: boolean;
}

export default function TopBar({
  roomCode,
  balance,
  pot,
  isMuted = true,
  onMuteToggle,
  isSpectator = false,
}: TopBarProps) {
  const { lang } = useLanguage();
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    if (!roomCode) return;
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const inviteFriends = () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const msg =
      lang === 'en'
        ? `Come play Conquian with me! Join here: ${url}`
        : `Ven a jugar Conquian conmigo. Únete aquí: ${url}`;
    navigator.clipboard.writeText(msg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-[#0f0f0f]/90 backdrop-blur-md border-b border-[#2a2a2a]">
      <div className="flex items-center justify-between px-4 py-2 max-w-7xl mx-auto">
        {/* Left: Room info */}
        <div className="flex items-center gap-3">
          <span className="text-amber-500 font-bold text-sm tracking-widest font-serif">
            CONQUIAN SOCIAL
          </span>
          {roomCode && (
            <>
              <span className="text-gray-600">|</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{t('roomCode', lang)}</span>
                <span className="text-white font-mono font-bold tracking-widest bg-[#1c1c1c] border border-[#333] rounded px-2 py-0.5 text-sm">
                  {roomCode}
                </span>
                <button
                  id="copy-room-code"
                  onClick={copyCode}
                  title={t('copyCode', lang)}
                  className="text-gray-400 hover:text-amber-400 transition-colors"
                >
                  {copied ? (
                    <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Center: Balance + Pot */}
        {roomCode && (
          <div className="flex items-center gap-6">
            {balance !== undefined && (
              <div className="text-center">
                <div className="text-xs text-gray-500 uppercase tracking-wider">{t('balance', lang)}</div>
                <div className="text-sm font-bold text-green-400">${balance.toFixed(2)}</div>
              </div>
            )}
            {pot !== undefined && (
              <div className="text-center">
                <div className="text-xs text-gray-500 uppercase tracking-wider">{t('pot', lang)}</div>
                <div className="text-sm font-bold text-amber-400">${pot.toFixed(2)}</div>
              </div>
            )}
            {isSpectator && (
              <span className="chip chip-gold text-xs">{t('spectating', lang)}</span>
            )}
          </div>
        )}

        {/* Right: Controls */}
        <div className="flex items-center gap-3">
          {roomCode && (
            <button
              id="invite-friends-btn"
              onClick={inviteFriends}
              title={t('inviteFriends', lang)}
              className="text-gray-400 hover:text-amber-400 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
          )}
          {onMuteToggle && (
            <button
              id="mute-toggle-btn"
              onClick={onMuteToggle}
              title={isMuted ? t('unmute', lang) : t('mute', lang)}
              className={`transition-colors ${isMuted ? 'text-red-400 hover:text-red-300' : 'text-green-400 hover:text-green-300'}`}
            >
              {isMuted ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 6v12m0 0l-3-3m3 3l3-3M9 9a3 3 0 000 6" />
                </svg>
              )}
            </button>
          )}
          <LanguageToggle />
        </div>
      </div>
    </header>
  );
}
