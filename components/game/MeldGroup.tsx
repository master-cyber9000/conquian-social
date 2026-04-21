'use client';

import { CardType } from '@/lib/supabase';
import Card from './Card';

interface MeldGroupProps {
  meld: CardType[];
  index: number;
  size?: 'sm' | 'md';
  onExtend?: (meldIndex: number) => void;
  canExtend?: boolean;
}

export default function MeldGroup({
  meld,
  index,
  size = 'sm',
  onExtend,
  canExtend = false,
}: MeldGroupProps) {
  return (
    <div
      className={`meld-group relative ${canExtend ? 'cursor-pointer' : ''}`}
      onClick={() => canExtend && onExtend?.(index)}
      title={canExtend ? 'Click to extend this meld' : undefined}
    >
      {meld.map((card, i) => (
        <Card key={`${card.id}-${i}`} card={card} size={size} />
      ))}
      {canExtend && (
        <div className="absolute -top-2 -right-2 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center text-xs font-bold text-black">
          +
        </div>
      )}
    </div>
  );
}
