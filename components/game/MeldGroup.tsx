'use client';

import { CardType } from '@/lib/supabase';
import Card from './Card';

interface MeldGroupProps {
  meld: CardType[];
  index: number;
  size?: 'sm' | 'md';
  onExtend?: (meldIndex: number, cardId?: string) => void;
  canExtend?: boolean;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectCard?: (cardId: string) => void;
  highlightedCardId?: string | null;
}

export default function MeldGroup({
  meld,
  index,
  size = 'sm',
  onExtend,
  canExtend = false,
  selectable = false,
  selectedIds,
  onSelectCard,
  highlightedCardId,
}: MeldGroupProps) {
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const cardId = e.dataTransfer.getData('cardId');
    const source = e.dataTransfer.getData('source');
    
    // If dragging directly from player hand, attempt to extend immediately
    if (source === 'hand' && cardId) {
      onExtend?.(index, cardId);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  return (
    <div
      className={`meld-group relative ${canExtend ? 'cursor-pointer' : ''}`}
      onClick={() => canExtend && onExtend?.(index)}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      title={canExtend ? 'Click to extend this meld' : undefined}
    >
      {meld.map((card, i) => (
        <Card key={`${card.id}-${i}`} card={card} size={size} 
              selected={selectedIds?.has(card.id)} 
              highlighted={highlightedCardId === card.id ? 'green' : undefined}
              onClick={selectable ? () => onSelectCard?.(card.id) : undefined} />
      ))}
      {canExtend && (
        <div className="absolute -top-2 -right-2 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center text-xs font-bold text-black">
          +
        </div>
      )}
    </div>
  );
}
