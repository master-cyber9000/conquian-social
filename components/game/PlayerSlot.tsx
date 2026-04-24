'use client';

import { useEffect, useState, useRef } from 'react';
import { Player } from '@/lib/supabase';
import { CardType } from '@/lib/supabase';
import { countMeldedCards } from '@/lib/gameLogic';
import MeldGroup from './MeldGroup';
import { useLanguage } from '@/hooks/useLanguage';
import { t } from '@/lib/i18n';

function VolumeRing({ identity, volumeMapRef, color }: { identity: string; volumeMapRef: React.MutableRefObject<Map<string, number>>; color: string }) {
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame: number;
    const animate = () => {
      if (ringRef.current && volumeMapRef?.current) {
         const vol = volumeMapRef.current.get(identity) || 0;
         const scale = 1 + Math.min(vol * 0.8, 0.25);
         ringRef.current.style.transform = `translate(-50%, -50%) scale(${scale})`;
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [identity, volumeMapRef]);

  return (
    <div 
      ref={ringRef}
      className="absolute top-1/2 left-1/2 w-14 h-14 rounded-full transition-transform duration-[50ms] z-0"
      style={{ transform: 'translate(-50%, -50%) scale(1)', backgroundColor: color }}
    />
  );
}

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
  onExtendMeld?: (meldIndex: number, cardId?: string) => void;
  extendableMelds?: Set<number>;
  isHoldingCard?: boolean;
  selectableTable?: boolean;
  selectedTableCardIds?: Set<string>;
  onSelectTableCard?: (cardId: string) => void;
  forcedCardId?: string | null;
  isSpeaking?: boolean;
  volumeMapRef?: React.MutableRefObject<Map<string, number>>;
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
  isHoldingCard = false,
  selectableTable = false,
  selectedTableCardIds,
  onSelectTableCard,
  forcedCardId,
  isSpeaking = false,
  volumeMapRef,
}: PlayerSlotProps) {
  const { lang } = useLanguage();
  const meldedCount = countMeldedCards(melds);
  const borderColor = BORDER_COLORS[player.border_color] ?? '#c9a84c';

  // Timer arc calculations (SVG circle)
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (timeLeft / 30) * circumference;
  const timerColor = timeLeft > 10 ? '#22c55e' : timeLeft > 5 ? '#f59e0b' : '#ef4444';

  const containerClass = {
    top: 'flex-col-reverse items-center', // text above avatar (outside table)
    left: 'flex-col items-center',
    right: 'flex-col items-center',
    bottom: 'flex-col items-center',      // text below avatar (outside table)
  }[position];

  const meldPositionClass = {
    top: 'absolute top-[100%] mt-3 left-1/2 -translate-x-1/2 z-20 w-[240px]',     // point inwards
    bottom: 'absolute bottom-[100%] mb-3 left-1/2 -translate-x-1/2 z-20 w-[240px]', // point inwards
    left: 'absolute left-[100%] ml-4 top-1/2 -translate-y-1/2 z-20 w-[240px]',      // point inwards
    right: 'absolute right-[100%] mr-4 top-1/2 -translate-y-1/2 z-20 w-[240px]',    // point inwards
  }[position];

  return (
    <div className={`relative flex ${containerClass} gap-1.5`}>
      {/* Avatar Bubble */}
      <div className="relative flex flex-col items-center gap-1 z-10">
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

        {/* Dynamic Voice Activity Expansion Ring */}
        {isSpeaking && volumeMapRef && (
          <VolumeRing identity={player.display_name} volumeMapRef={volumeMapRef} color={borderColor} />
        )}

        <div
          className={`avatar-bubble w-14 h-14 ${isActive ? 'active-turn' : ''} relative z-10`}
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

        {/* Holding card indicator */}
        {isHoldingCard && (
          <div className="absolute -top-1 -right-3 w-7 h-9 rounded bg-blue-900 border-[1.5px] border-white shadow-xl flex items-center justify-center transform rotate-12 z-20 overflow-hidden">
            <div className="w-[calc(100%-2px)] h-[calc(100%-2px)] bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.1),rgba(255,255,255,0.1)_2px,transparent_2px,transparent_4px)] rounded-[1px]"></div>
          </div>
        )}

        {/* Ready badge */}
        {player.is_ready && (
          <span className="chip chip-green absolute -bottom-1 z-30 text-[10px] px-1.5 py-0 shadow-[0_4px_10px_rgba(34,197,94,0.3)] border border-green-500/50">
            {t('ready', lang)}
          </span>
        )}
      </div>

      {/* Player info */}
      <div className="flex flex-col items-center gap-0.5 z-10 w-fit">
        <span className="text-xs font-semibold text-white truncate max-w-[80px]">
          {isLocal ? `★ ${player.display_name}` : player.display_name}
        </span>
        <span className="text-[10px] text-green-400 font-medium">${player.balance.toFixed(2)}</span>
        {meldedCount > 0 && (
          <span className="text-[9px] font-bold tracking-widest uppercase text-amber-400/80">
            {meldedCount}/10 {t('meld', lang)}
          </span>
        )}
        {!isConnected && (
          <span className="text-[10px] text-yellow-400 animate-pulse">
            {t('reconnecting', lang)}
          </span>
        )}
      </div>

      {/* Melds (absolute positioned pointing to the table center) */}
      {melds.length > 0 && (
        <div className={`${meldPositionClass} flex flex-col items-center sm:flex-row sm:items-start gap-1 sm:gap-1.5 flex-wrap justify-center`}>
          {melds.map((meld, i) => (
            <MeldGroup
              key={i}
              meld={meld}
              index={i}
              size="sm"
              canExtend={extendableMelds.has(i)}
              onExtend={onExtendMeld}
              selectable={selectableTable}
              selectedIds={selectedTableCardIds}
              onSelectCard={onSelectTableCard}
              highlightedCardId={forcedCardId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
