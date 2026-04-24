'use client';

import { CardType, Player } from '@/lib/supabase';
import Card from './Card';
import { useLanguage } from '@/hooks/useLanguage';
import { t } from '@/lib/i18n';
import Button from '@/components/ui/Button';

interface DiscardPileProps {
  topCard: CardType | null;
  stockCount: number;
  isActivePlayer: boolean;   // local player is the current_player
  lastDiscardBy: string | null;
  localPlayerId: string;
  canClaim: boolean;
  onClaim: () => void;
  onDraw: () => void;
  canDraw: boolean;
  onForce?: () => void;
  canForce?: boolean;
  isSelfForceDiscard?: boolean;
  turnPhase: string;
  // Offer countdown (0 = not in offer phase)
  offerCountdown: number;
  // Who has already clicked Claim { playerId: timestamp }
  discardClaims: Record<string, number>;
  // All players for avatar display
  allActivePlayers?: { player_id: string; avatar: string; display_name: string }[];
}

export default function DiscardPile({
  topCard,
  stockCount,
  isActivePlayer,
  lastDiscardBy,
  localPlayerId,
  canClaim,
  onClaim,
  onDraw,
  canDraw,
  onForce,
  canForce = false,
  isSelfForceDiscard = false,
  turnPhase,
  offerCountdown,
  discardClaims,
  allActivePlayers = [],
}: DiscardPileProps) {
  const { lang } = useLanguage();

  const inOfferPhase = turnPhase === 'offer_discard';
  const hasClaimed = localPlayerId in discardClaims;
  const claimerIds = Object.keys(discardClaims);

  // Circular progress for countdown (SVG)
  const RADIUS = 18;
  const CIRC = 2 * Math.PI * RADIUS;
  const progress = offerCountdown > 0 ? offerCountdown / 10 : 0;
  const strokeDash = CIRC * (1 - progress);
  const isUrgent = offerCountdown <= 3 && offerCountdown > 0;

  return (
    <div className="flex flex-row gap-6 items-end justify-center">

      {/* ── Stock Pile ────────────────────────────────── */}
      <div className="flex flex-col items-center gap-2">
        {/* Relative wrapper keeps depth-cards contained */}
        <div className="relative w-14 h-20 flex-shrink-0">
          {/* Shadow cards — behind the real card via z-index */}
          <div className="absolute inset-0 card-back rounded-lg opacity-30 translate-x-1 translate-y-1" style={{ zIndex: 0 }} />
          <div className="absolute inset-0 card-back rounded-lg opacity-50 translate-x-0.5 translate-y-0.5" style={{ zIndex: 1 }} />
          <div className="relative" style={{ zIndex: 2 }}>
            <Card card={{ suit: 'spades', rank: 'A', id: 'stock-back' }} faceDown size="md" />
          </div>
        </div>
        <span className="text-[11px] text-gray-400 font-medium">{t('stockPile', lang)}</span>
        <span className="text-[11px] text-gray-500">{t('cardsLeft', lang, { n: stockCount })}</span>
        {canDraw && (
          <Button id="draw-btn" variant="secondary" size="sm" onClick={onDraw}>
            {lang === 'en' ? 'Draw' : 'Comer'}
          </Button>
        )}
      </div>

      {/* ── Discard Pile ──────────────────────────────── */}
      <div className="flex flex-col items-center gap-2">

        {/* Card + countdown ring */}
        <div className="relative w-14 h-20 flex-shrink-0">
          {topCard ? (
            <Card card={topCard} size="md" />
          ) : (
            <div className="w-14 h-20 border-2 border-dashed border-green-900/60 rounded-lg flex items-center justify-center">
              <span className="text-green-900/60 text-xs">—</span>
            </div>
          )}

          {/* Countdown ring overlay (top-right of card) */}
          {inOfferPhase && offerCountdown > 0 && (
            <div className="absolute -top-3 -right-3 z-20">
              <svg width="44" height="44" className="drop-shadow-lg">
                {/* Background ring */}
                <circle cx="22" cy="22" r={RADIUS} fill="rgba(0,0,0,0.7)"
                  stroke="#333" strokeWidth="3" />
                {/* Progress ring */}
                <circle cx="22" cy="22" r={RADIUS} fill="none"
                  stroke={isUrgent ? '#ef4444' : '#f59e0b'}
                  strokeWidth="3"
                  strokeDasharray={`${CIRC}`}
                  strokeDashoffset={strokeDash}
                  strokeLinecap="round"
                  transform="rotate(-90 22 22)"
                  style={{ transition: 'stroke-dashoffset 0.2s linear, stroke 0.3s' }}
                />
                <text x="22" y="27" textAnchor="middle"
                  className={`text-sm font-bold ${isUrgent ? 'fill-red-400' : 'fill-amber-400'}`}
                  fontSize="13" fontWeight="bold"
                  fill={isUrgent ? '#f87171' : '#fbbf24'}
                >
                  {offerCountdown}
                </text>
              </svg>
            </div>
          )}
        </div>

        <span className="text-[11px] text-gray-400 font-medium">{t('discardPile', lang)}</span>

        {/* Claimer avatars */}
        {inOfferPhase && claimerIds.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap justify-center max-w-[120px]">
            {claimerIds.map((pid) => {
              const p = allActivePlayers.find((ap) => ap.player_id === pid);
              return p ? (
                <div key={pid} title={p.display_name}
                  className="w-6 h-6 rounded-full bg-green-900 border border-green-500 flex items-center justify-center text-xs"
                >
                  {p.avatar}
                </div>
              ) : null;
            })}
          </div>
        )}

        {/* Action buttons (below card, always readable) */}
        <div className="flex flex-col gap-1.5 items-center">
          {/* Claim button */}
          {canClaim && inOfferPhase && (
            <Button
              id={hasClaimed ? 'claimed-btn' : 'claim-discard-btn'}
              variant={hasClaimed ? 'secondary' : (isActivePlayer ? 'primary' : 'gold')}
              size="sm"
              onClick={!hasClaimed ? onClaim : undefined}
              className={hasClaimed ? 'opacity-60 cursor-default' : ''}
            >
              {hasClaimed
                ? `✓ ${lang === 'en' ? 'Claimed' : 'Reclamado'}`
                : `👆 ${t('claim', lang)}`}
            </Button>
          )}

          {/* Force button */}
          {canForce && onForce && (
            <Button id="force-btn" variant={isSelfForceDiscard ? 'primary' : 'danger'} size="sm" onClick={onForce}>
              {isSelfForceDiscard ? (lang === 'en' ? 'Add to Meld' : 'Añadir al Grupo') : (lang === 'en' ? '⚡ Force' : '⚡ Forzar')}
            </Button>
          )}
        </div>

        {/* Priority hint during offer */}
        {inOfferPhase && isActivePlayer && offerCountdown > 0 && !hasClaimed && (
          <p className="text-[10px] text-amber-600 text-center max-w-[100px]">
            {lang === 'en' ? 'You have first pick' : 'Tienes primera opción'}
          </p>
        )}
      </div>
    </div>
  );
}
