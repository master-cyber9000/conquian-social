'use client';

import { useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { t } from '@/lib/i18n';
import LanguageToggle from './LanguageToggle';
import Button from '@/components/ui/Button';

interface TopBarProps {
  roomCode?: string;
  balance?: number;
  bet?: number;
  pot?: number;
  isMicMuted?: boolean;
  toggleMic?: () => void;
  isSpeakerMuted?: boolean;
  toggleSpeaker?: () => void;
  isSpectator?: boolean;
  onHowToPlay?: () => void;
}

export default function TopBar({
  roomCode,
  balance,
  bet,
  pot,
  isMicMuted = true,
  toggleMic,
  isSpeakerMuted = false,
  toggleSpeaker,
  isSpectator = false,
  onHowToPlay,
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
      <div className="flex flex-wrap items-center justify-between px-3 sm:px-4 py-2 max-w-7xl mx-auto gap-y-2 gap-x-2">
        {/* Left: Room info */}
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-amber-500 font-bold text-xs sm:text-sm tracking-widest font-serif hidden sm:inline-block">
            CONQUIAN SOCIAL
          </span>
          {roomCode && (
            <>
              <span className="hidden sm:inline-block text-gray-600">|</span>
              <div className="flex items-center gap-1 sm:gap-2">
                <span className="text-[10px] sm:text-xs text-gray-400">{t('roomCode', lang)}</span>
                <span className="text-white font-mono font-bold tracking-widest bg-[#1c1c1c] border border-[#333] rounded px-1.5 sm:px-2 py-0.5 text-xs sm:text-sm">
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
          <div className="flex items-center justify-center gap-2 sm:gap-6 w-full order-3 sm:order-none sm:w-auto">
            {balance !== undefined && (
              <div className="text-center">
                <div className="text-[9px] sm:text-xs text-gray-500 uppercase tracking-wider">{t('balance', lang)}</div>
                <div className="text-xs sm:text-sm font-bold text-green-400">${Math.max(0, balance - (bet ?? 0)).toFixed(2)}</div>
              </div>
            )}
            {bet !== undefined && bet > 0 && (
              <div className="text-center">
                <div className="text-xs text-rose-500/70 uppercase tracking-wider">{lang === 'en' ? 'Bet' : 'Apuesta'}</div>
                <div className="text-sm font-bold text-rose-400">${bet.toFixed(2)}</div>
              </div>
            )}
            {pot !== undefined && (
              <div className="text-center">
                <div className="text-[9px] sm:text-xs text-gray-500 uppercase tracking-wider">{t('pot', lang)}</div>
                <div className="text-xs sm:text-sm font-bold text-amber-400">${pot.toFixed(2)}</div>
              </div>
            )}
            {isSpectator && (
              <span className="chip chip-gold text-xs">{t('spectating', lang)}</span>
            )}
          </div>
        )}

        {/* Right: Controls */}
        <div className="flex items-center gap-3">
          {onHowToPlay && (
            <button
              id="how-to-play-btn"
              onClick={onHowToPlay}
              title={lang === 'en' ? 'How to Play' : 'Cómo Jugar'}
              className="w-7 h-7 flex items-center justify-center rounded-full border border-[#444] text-gray-400 hover:text-amber-400 hover:border-amber-500/50 transition-all duration-200 text-sm font-bold"
            >
              ?
            </button>
          )}
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
          {toggleSpeaker && (
            <button
              id="speaker-toggle-btn"
              onClick={toggleSpeaker}
              title={isSpeakerMuted ? lang === 'en' ? 'Unmute Speakers' : 'Activar Sonido' : lang === 'en' ? 'Deafen' : 'Silenciar Sonido'}
              className={`transition-colors ${isSpeakerMuted ? 'text-red-400 hover:text-red-300' : 'text-gray-400 hover:text-gray-300'}`}
            >
              {isSpeakerMuted ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              )}
            </button>
          )}
          {toggleMic && (
            <button
              id="mic-toggle-btn"
              onClick={toggleMic}
              title={isMicMuted ? t('unmute', lang) : t('mute', lang)}
              className={`transition-colors ${isMicMuted ? 'text-red-400 hover:text-red-300' : 'text-green-400 hover:text-green-300'}`}
            >
              {isMicMuted ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 10v2a7 7 0 01-14 0v-2m-1.5 6.5A9.953 9.953 0 0012 19c-2.43 0-4.654-.863-6.425-2.29m13.25 0A9.953 9.953 0 0112 19v4m0 0h-4m4 0h4m-5.5-12.5V3a3 3 0 00-6 0v1.5m8.5 4.5v-1a3 3 0 00-1-2.2m-6 3.7A2.99 2.99 0 019 10V8m8.5 4.5l-13-13" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 10v2a7 7 0 01-14 0v-2M12 18v4m0 0h-4m4 0h4m-4-11V3a3 3 0 00-6 0v4a3 3 0 006 0z" />
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
