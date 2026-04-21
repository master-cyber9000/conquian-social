'use client';

import { CardType } from '@/lib/supabase';
import Card from './Card';
import { useLanguage } from '@/hooks/useLanguage';
import { t } from '@/lib/i18n';
import Button from '@/components/ui/Button';

interface DiscardPileProps {
  topCard: CardType | null;
  stockCount: number;
  canClaim: boolean;
  isActivePlayer: boolean;
  onClaim: () => void;
  onDraw: () => void;
  canDraw: boolean;
  onForce?: () => void;
  canForce?: boolean;
  turnPhase: string;
}

export default function DiscardPile({
  topCard,
  stockCount,
  canClaim,
  isActivePlayer,
  onClaim,
  onDraw,
  canDraw,
  onForce,
  canForce = false,
  turnPhase,
}: DiscardPileProps) {
  const { lang } = useLanguage();
  const offerPhase = turnPhase === 'offer_discard' || turnPhase === 'draw_or_take';

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-6 items-end">
        {/* Stock Pile */}
        <div className="flex flex-col items-center gap-1">
          <div className="relative">
            {/* Stack effect */}
            <div className="absolute top-1 left-1 card-back w-14 h-20 opacity-40" />
            <div className="absolute top-0.5 left-0.5 card-back w-14 h-20 opacity-60" />
            <Card card={{ suit: 'spades', rank: 'A', id: 'stock' }} faceDown size="md" />
          </div>
          <span className="text-xs text-gray-400">
            {t('cardsLeft', lang, { n: stockCount })}
          </span>
          {isActivePlayer && canDraw && turnPhase === 'draw_or_take' && (
            <Button id="draw-btn" variant="secondary" size="sm" onClick={onDraw}>
              {t('draw', lang)}
            </Button>
          )}
        </div>

        {/* Discard Pile */}
        <div className="flex flex-col items-center gap-1">
          {topCard ? (
            <div className="relative">
              <Card card={topCard} size="md" />
              {/* Claim / Force overlays */}
              {offerPhase && !isActivePlayer && canClaim && (
                <button
                  id="claim-discard-btn"
                  onClick={onClaim}
                  className="absolute inset-0 flex items-center justify-center bg-amber-500/30 border-2 border-amber-400 rounded-lg backdrop-blur-sm text-amber-200 font-bold text-xs hover:bg-amber-500/50 transition-colors"
                >
                  {t('claim', lang)}
                </button>
              )}
              {isActivePlayer && offerPhase && (
                <button
                  id="take-discard-btn"
                  onClick={onClaim}
                  className="absolute inset-0 flex items-center justify-center bg-green-500/30 border-2 border-green-400 rounded-lg backdrop-blur-sm text-green-200 font-bold text-xs hover:bg-green-500/50 transition-colors"
                >
                  {t('claim', lang)}
                </button>
              )}
            </div>
          ) : (
            <div className="w-14 h-20 border-2 border-dashed border-green-900 rounded-lg flex items-center justify-center">
              <span className="text-green-900 text-xs">—</span>
            </div>
          )}
          <span className="text-xs text-gray-400">{t('discardPile', lang)}</span>
          {canForce && onForce && (
            <Button id="force-btn" variant="danger" size="sm" onClick={onForce}>
              {t('force', lang)}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
