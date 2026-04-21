'use client';

import { CardType } from '@/lib/supabase';

const SUIT_SYMBOL: Record<CardType['suit'], string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

const isRed = (suit: CardType['suit']) => suit === 'hearts' || suit === 'diamonds';

interface CardProps {
  card: CardType;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  faceDown?: boolean;
}

export default function Card({
  card,
  selected = false,
  onClick,
  disabled = false,
  size = 'md',
  faceDown = false,
}: CardProps) {
  const dimensions = {
    sm: 'w-10 h-14',
    md: 'w-14 h-20',
    lg: 'w-16 h-24',
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const color = isRed(card.suit) ? 'text-red-600' : 'text-gray-900';

  if (faceDown) {
    return (
      <div
        className={`card-back ${dimensions[size]} flex-shrink-0`}
        aria-hidden="true"
      />
    );
  }

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick && !disabled ? 0 : undefined}
      id={`card-${card.id}`}
      onClick={!disabled ? onClick : undefined}
      onKeyDown={!disabled && onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
      aria-pressed={selected}
      aria-label={`${card.rank} of ${card.suit}`}
      className={`card-face ${dimensions[size]} flex flex-col justify-between p-1 flex-shrink-0 ${
        selected ? 'selected' : ''
      } ${disabled ? 'opacity-60 cursor-not-allowed' : onClick ? 'cursor-pointer' : ''}`}
    >
      {/* Top-left rank + suit */}
      <div className={`flex flex-col leading-none ${color} ${textSizes[size]} font-bold`}>
        <span>{card.rank}</span>
        <span>{SUIT_SYMBOL[card.suit]}</span>
      </div>

      {/* Center suit */}
      <div className={`text-center ${color} ${size === 'lg' ? 'text-xl' : 'text-base'} leading-none`}>
        {SUIT_SYMBOL[card.suit]}
      </div>

      {/* Bottom-right (rotated) */}
      <div className={`flex flex-col leading-none ${color} ${textSizes[size]} font-bold rotate-180 self-end`}>
        <span>{card.rank}</span>
        <span>{SUIT_SYMBOL[card.suit]}</span>
      </div>
    </div>
  );
}
