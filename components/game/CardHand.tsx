'use client';

import { CardType } from '@/lib/supabase';
import Card from './Card';
import { useLanguage } from '@/hooks/useLanguage';
import { t } from '@/lib/i18n';
import { isValidMeld } from '@/lib/gameLogic';
import Button from '@/components/ui/Button';

interface CardHandProps {
  cards: CardType[];
  selectedIds: Set<string>;
  onSelect: (cardId: string) => void;
  onMeld: () => void;
  onDiscard: () => void;
  canMeld: boolean;
  canDiscard: boolean;
  isYourTurn: boolean;
  turnPhase: string;
  disabled?: boolean;
}

export default function CardHand({
  cards,
  selectedIds,
  onSelect,
  onMeld,
  onDiscard,
  canMeld,
  canDiscard,
  isYourTurn,
  turnPhase,
  disabled = false,
}: CardHandProps) {
  const { lang } = useLanguage();
  const selectedCards = cards.filter((c) => selectedIds.has(c.id));
  const meldValid = selectedCards.length >= 3 && isValidMeld(selectedCards);

  const meldPhase = turnPhase === 'meld_or_discard' || turnPhase === 'draw_or_take';
  const discardPhase = turnPhase === 'meld_or_discard';

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Action Buttons */}
      {isYourTurn && (
        <div className="flex items-center gap-3">
          <Button
            id="meld-btn"
            variant="gold"
            size="sm"
            onClick={onMeld}
            disabled={disabled || !canMeld || !meldValid || !meldPhase}
            title={t('selectCardsToMeld', lang)}
          >
            {t('meld', lang)} {selectedCards.length >= 3 ? `(${selectedCards.length})` : ''}
          </Button>
          <Button
            id="discard-btn"
            variant="danger"
            size="sm"
            onClick={onDiscard}
            disabled={disabled || !canDiscard || selectedIds.size !== 1 || !discardPhase}
          >
            {t('discard', lang)}
          </Button>
        </div>
      )}

      {/* Selection hint */}
      {isYourTurn && selectedCards.length > 0 && (
        <p className="text-xs text-gray-400">
          {selectedCards.length >= 3
            ? meldValid
              ? `✓ ${t('meld', lang)}`
              : `✗ ${t('invalidMeld', lang)}`
            : selectedCards.length === 1
            ? t('selectOneToDiscard', lang)
            : t('selectCardsToMeld', lang)}
        </p>
      )}

      {/* Card Fan */}
      <div className="hand-fan flex flex-row items-end pb-2 px-4 flex-wrap justify-center max-w-full">
        {cards.map((card) => (
          <Card
            key={card.id}
            card={card}
            selected={selectedIds.has(card.id)}
            onClick={() => !disabled && isYourTurn && onSelect(card.id)}
            disabled={disabled || !isYourTurn}
            size="md"
          />
        ))}
        {cards.length === 0 && (
          <p className="text-gray-500 text-sm italic">— {t('meld', lang)} all cards —</p>
        )}
      </div>
    </div>
  );
}
