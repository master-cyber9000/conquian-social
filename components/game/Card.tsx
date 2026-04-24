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
  highlighted?: boolean | 'green';
}

export default function Card({
  card,
  selected = false,
  onClick,
  disabled = false,
  size = 'md',
  faceDown = false,
  highlighted = false,
}: CardProps) {
  const dimensions = {
    sm: 'w-10 h-14',
    md: 'w-14 h-20',
    lg: 'w-16 h-24',
  };

  const rankSizes = {
    sm: 'text-2xl',
    md: 'text-[32px]',
    lg: 'text-[42px]',
  };

  const suitSizes = {
    sm: 'text-xl mt-1',
    md: 'text-3xl mt-2',
    lg: 'text-4xl mt-3',
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
      className={`card-face ${dimensions[size]} flex flex-col items-center justify-center py-0.5 flex-shrink-0 relative overflow-hidden ${
        selected ? 'selected' : ''
      } ${
        highlighted === 'green' ? 'ring-[3px] ring-green-500 ring-offset-1 ring-offset-transparent shadow-[0_0_20px_rgba(34,197,94,0.7)] z-10' :
        highlighted ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-transparent shadow-lg shadow-amber-500/40' : ''
      } ${disabled ? 'opacity-60 cursor-not-allowed' : onClick ? 'cursor-pointer' : ''}`}
    >
      <div className={`leading-none font-black ${color} ${rankSizes[size]} tracking-tighter`}>
        {card.rank}
      </div>
      <div className={`leading-none ${color} ${suitSizes[size]}`}>
        {SUIT_SYMBOL[card.suit]}
      </div>
    </div>
  );
}
