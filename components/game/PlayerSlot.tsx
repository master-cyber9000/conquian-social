'use client';

import { useEffect, useState } from 'react';
import { Player } from '@/lib/supabase';
import { CardType } from '@/lib/supabase';
import { countMeldedCards } from '@/lib/gameLogic';
import MeldGroup from './MeldGroup';
import { useLanguage } from '@/hooks/useLanguage';
import { t } from '@/lib/i18n';

const BORDER_COLORS: Record<string, string> = {
  gold: '#c9a84c',
  red: '#dc2626',
  blue: '#3b82f6',
  green: '#22c55e',
  purple: '#a855f7',
  white: '#f5f5f5',
};

interface PlayerSlotProps {
  player: Player;
  melds: CardType[][];
  isActive: boolean;
  isLocal: boolean;
  isConnected: boolean;
  timeLeft?: number; // 0-30
  position: 'top' | 'left' | 'right' | 'bottom';
  onExtendMeld?: (meldIndex: number) => void;
  extendableMelds?: Set<number>;
}

export default function PlayerSlot({
  player,
  melds,
  isActive,
  isLocal,
  isConnected,
  timeLeft = 30,
  position,
  onExtendMeld,
  extendableMelds = new Set(),
}: PlayerSlotProps) {
  const { lang } = useLanguage();
  const meldedCount = countMeldedCards(melds);
  const borderColor = BORDER_COLORS[player.border_color] ?? '#c9a84c';

  // Timer arc calculations (SVG circle)
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (timeLeft / 30) * circumference;
  const timerColor = timeLeft > 10 ? '#22c55e' : timeLeft > 5 ? '#f59e0b' : '#ef4444';

  const positionClass = {
    top: 'flex-col items-center',
    left: 'flex-col items-center',
    right: 'flex-col items-center',
    bottom: 'flex-col items-center',
  }[position];

  return (
    <div className={`flex ${positionClass} gap-1.5`}>
      {/* Melds (shown above/beside avatar based on position) */}
      {melds.length > 0 && (
        <div className="flex gap-1 flex-wrap justify-center max-w-48">
          {melds.map((meld, i) => (
            <MeldGroup
              key={i}
              meld={meld}
              index={i}
              size="sm"
              canExtend={extendableMelds.has(i)}
              onExtend={onExtendMeld}
            />
          ))}
        </div>
      )}

      {/* Avatar Bubble */}
      <div className="relative flex flex-col items-center gap-1">
        {/* Timer arc (only when active) */}
        {isActive && (
          <svg
            className="absolute -inset-2 w-[72px] h-[72px]"
            viewBox="0 0 72 72"
            style={{ transform: 'rotate(-90deg)' }}
          >
            <circle
              cx="36"
              cy="36"
              r={radius}
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="3"
            />
            <circle
              cx="36"
              cy="36"
              r={radius}
              fill="none"
              stroke={timerColor}
              strokeWidth="3"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              className="timer-arc"
            />
          </svg>
        )}

        <div
          className={`avatar-bubble w-14 h-14 ${isActive ? 'active-turn' : ''}`}
          style={{ borderColor }}
        >
          <span className="text-2xl leading-none select-none">{player.avatar}</span>

          {/* Reconnecting overlay */}
          {!isConnected && (
            <div className="absolute inset-0 rounded-full bg-black/70 flex items-center justify-center">
              <svg className="w-4 h-4 animate-spin text-yellow-400" fill="none" viewBox="0 0 24 24">
                <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          )}
        </div>

        {/* Ready badge */}
        {player.is_ready && (
          <span className="chip chip-green absolute -bottom-1 text-[10px] px-1.5 py-0">
            {t('ready', lang)}
          </span>
        )}
      </div>

      {/* Player info */}
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-xs font-semibold text-white truncate max-w-[80px]">
          {isLocal ? `★ ${player.display_name}` : player.display_name}
        </span>
        <span className="text-xs text-green-400">${player.balance.toFixed(2)}</span>
        {meldedCount > 0 && (
          <span className="text-[10px] text-amber-400">
            {meldedCount}/10 {t('meld', lang)}
          </span>
        )}
        {!isConnected && (
          <span className="text-[10px] text-yellow-400 animate-pulse">
            {t('reconnecting', lang)}
          </span>
        )}
      </div>
    </div>
  );
}
