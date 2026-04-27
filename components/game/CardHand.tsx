'use client';

import { useState, useEffect, useRef } from 'react';
import { CardType } from '@/lib/supabase';
import Card from './Card';
import Button from '@/components/ui/Button';
import { useLanguage } from '@/hooks/useLanguage';
import { t } from '@/lib/i18n';
import { isValidMeld, findMultiCardExtensions, extractCardsFromMeld } from '@/lib/gameLogic';

interface CardHandProps {
  cards: CardType[];
  selectedIds: Set<string>;
  onSelect: (id: string) => void;
  onMeld: (cards: CardType[]) => void;
  onDiscard: (card: CardType) => void;
  canMeld: boolean;
  canDiscard: boolean;
  isYourTurn: boolean;
  turnPhase: string;
  drawnCard?: CardType | null;
  drawnCardSource?: 'stock' | 'discard' | null;
  onDiscardDrawnCard?: () => void;
  canForceDrawn?: boolean;
  onForceDrawn?: () => void;
  isSelfForceDrawn?: boolean;
  onReturnDiscard?: () => void;
  onCambiar?: (card: CardType | null) => void;
  hasCambiaLocked?: boolean;
  lockedCambiaCardId?: string;
  melds?: Record<string, CardType[][]>;
  tableCardIds?: Set<string>;
  localPlayerId?: string;
  onFold?: () => void;
  foldAllowed?: boolean;
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
  drawnCard = null,
  drawnCardSource = null,
  onDiscardDrawnCard,
  canForceDrawn = false,
  onForceDrawn,
  isSelfForceDrawn = false,
  onReturnDiscard,
  onCambiar,
  hasCambiaLocked = false,
  lockedCambiaCardId,
  melds = {},
  tableCardIds = new Set(),
  localPlayerId,
  onFold,
  foldAllowed = false,
}: CardHandProps) {
  const { lang } = useLanguage();

  // ── Local card ordering (drag to rearrange, client-only) ──────────────────
  const [localOrder, setLocalOrder] = useState<string[]>([]);
  const dragId = useRef<string | null>(null);

  // ── Cambia newly received card tracking ────────────────────────────────────
  const [receivedCambiaCardId, setReceivedCambiaCardId] = useState<string | null>(null);
  const previousHandIds = useRef<Set<string>>(new Set(cards.map(c => c.id)));
  const previousPhaseRef = useRef<string>(turnPhase);

  useEffect(() => {
    if (previousPhaseRef.current === 'cambia' && turnPhase !== 'cambia') {
      const currentIds = cards.map((c) => c.id);
      const newCardId = currentIds.find((id) => !previousHandIds.current.has(id));
      if (newCardId) {
        setReceivedCambiaCardId(newCardId);
        setTimeout(() => setReceivedCambiaCardId(null), 3000);
      }
    }
    previousHandIds.current = new Set(cards.map((c) => c.id));
    previousPhaseRef.current = turnPhase;
  }, [cards, turnPhase]);

  // Sync order when cards change (new deal, melds applied, etc.)
  useEffect(() => {
    setLocalOrder((prev) => {
      const newIds = new Set(cards.map((c) => c.id));
      // Keep existing positions, strip removed cards, append newly added ones
      const kept = prev.filter((id) => newIds.has(id));
      const added = cards.map((c) => c.id).filter((id) => !prev.includes(id));
      return [...kept, ...added];
    });
  }, [cards]);

  const orderedCards = localOrder
    .map((id) => cards.find((c) => c.id === id))
    .filter(Boolean) as CardType[];

  const handleDragStart = (e: React.DragEvent, cardId: string) => {
    dragId.current = cardId;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('source', 'hand');
    e.dataTransfer.setData('cardId', cardId);
  };

  const handleDragOver = (e: React.DragEvent, cardId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!dragId.current || dragId.current === cardId) return;
    setLocalOrder((prev) => {
      const next = [...prev];
      const from = next.indexOf(dragId.current!);
      const to = next.indexOf(cardId);
      if (from === -1 || to === -1) return prev;
      next.splice(from, 1);
      next.splice(to, 0, dragId.current!);
      return next;
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragId.current = null;
  };

  // ── Meld logic ─────────────────────────────────────────────────────────────
  const selectedCards = orderedCards.filter((c) => selectedIds.has(c.id));
  
  // Aggregate table cards and validate donor integrity
  let extractionValid = true;
  const selectedTableCards: CardType[] = [];
  if (localPlayerId && tableCardIds.size > 0 && melds[localPlayerId]) {
    melds[localPlayerId].forEach(meld => {
      const takingFromThisMeld = meld.filter(c => tableCardIds.has(c.id));
      if (takingFromThisMeld.length > 0) {
        selectedTableCards.push(...takingFromThisMeld);
        const remnants = extractCardsFromMeld(meld, takingFromThisMeld.map(c => c.id));
        if (!remnants) extractionValid = false; // Destroying the meld or leaving it invalid!
      }
    });
  }

  // Combined payload
  const combinedPayload = [...(drawnCard ? [drawnCard] : []), ...selectedCards, ...selectedTableCards];
  
  const multiExtensionMatch = findMultiCardExtensions(melds, combinedPayload, localPlayerId);
  const isMultiExtension = !!multiExtensionMatch;
  const meldValidNative = combinedPayload.length >= 3 && isValidMeld(combinedPayload);
  const validAssembly = extractionValid && (meldValidNative || isMultiExtension);

  // Can meld during offer_discard (existing hand/table), meld_or_discard, or with drawnCard
  const canMeldNow = isYourTurn && canMeld && validAssembly && combinedPayload.length > 0;

  const canDiscardHandCard = isYourTurn && canDiscard && !drawnCard && selectedIds.size === 1 && tableCardIds.size === 0;

  const meldLabel = () => {
    if (combinedPayload.length === 0) return t('meld', lang);
    if (!extractionValid) return lang === 'en' ? 'Extraction Invalid' : 'Extracción Inválida';
    
    if (meldValidNative) return lang === 'en' ? `Meld (${combinedPayload.length} cards)` : `Bajar (${combinedPayload.length} cartas)`;
    if (isMultiExtension) {
      if (multiExtensionMatch?.playerId !== localPlayerId) {
         return lang === 'en' ? 'Force Card' : 'Forzar Carta';
      }
      return lang === 'en' ? 'Add to Meld' : 'Añadir al Grupo';
    }
    
    const need = Math.max(0, 3 - combinedPayload.length);
    return need > 0 ? (lang === 'en' ? `Select ${need} more` : `Selecciona ${need} más`) : t('meld', lang);
  };

  // The primary render block safely handles non-active states (disabled buttons, etc.)

  return (
    <div className="flex flex-col items-center gap-3 w-full">

      {/* ── Drawn card staging ───────────────────────────────────────── */}
      {drawnCard && (
        <div className={`fixed z-50 left-4 md:left-8 top-1/2 -translate-y-1/2 w-[90%] md:w-72 max-w-sm flex flex-col items-center gap-4 py-8 px-4 rounded-2xl border-2 shadow-2xl backdrop-blur-xl transition-all duration-300 ${
          drawnCardSource === 'discard'
            ? 'border-amber-500 bg-amber-950/80 shadow-[0_0_40px_rgba(245,158,11,0.2)]'
            : 'border-blue-500 bg-blue-950/80 shadow-[0_0_40px_rgba(59,130,246,0.2)]'
        }`}>
          <p className={`text-xs font-bold uppercase tracking-wider ${
            drawnCardSource === 'discard' ? 'text-amber-400' : 'text-blue-400'
          }`}>
            {drawnCardSource === 'discard'
              ? lang === 'en' ? '⚠️ Claimed — must meld this card' : '⚠️ Reclamada — debes bajarla'
              : lang === 'en' ? '🃏 Drawn card — meld it or discard it' : '🃏 Carta sacada — baja o descarta'}
          </p>

          <div className="transform scale-125 my-2">
            <Card card={drawnCard} size="md" highlighted />
          </div>

          <p className="text-xs text-gray-400 text-center">
            {drawnCardSource === 'discard'
              ? lang === 'en' ? 'Select cards to form a valid meld with this card' : 'Selecciona cartas que formen una bajada válida'
              : lang === 'en' ? 'Select cards to meld, or discard this card to end your turn' : 'Selecciona cartas para bajar, o descarta para pasar'}
          </p>

          <div className="flex gap-2 w-full max-w-xs justify-center items-stretch flex-wrap">
            <Button id="meld-with-drawn-btn" variant="primary" size="sm" className="flex-1"
              onClick={() => canMeldNow && onMeld(combinedPayload)} disabled={!canMeldNow}>
              {meldLabel()}
            </Button>
            {canForceDrawn && !isSelfForceDrawn && onForceDrawn && (
              <Button id="force-drawn-btn" variant="danger" size="sm" className="flex-1" onClick={onForceDrawn}>
                {lang === 'en' ? '⚡ Force' : '⚡ Forzar'}
              </Button>
            )}
            {drawnCardSource === 'stock' && onDiscardDrawnCard && (
              <>
                <Button id="discard-drawn-btn" variant="ghost" size="sm" className="flex-1" onClick={onDiscardDrawnCard}>
                  {lang === 'en' ? 'Discard it' : 'Descartarla'}
                </Button>
                {foldAllowed && onFold && (
                  <Button id="fold-btn" variant="danger" size="sm" className="flex-1 whitespace-nowrap" onClick={onFold}>
                    {lang === 'en' ? 'Doble (Fold)' : 'Doblarse'}
                  </Button>
                )}
              </>
            )}
            {drawnCardSource === 'discard' && onReturnDiscard && (
              <Button id="return-discard-btn" variant="ghost" size="sm" className="flex-1" onClick={onReturnDiscard}>
                {lang === 'en' ? 'Return to Table' : 'Devolver a Mesa'}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ── Stable Action & Hint Footer ───────────────────────────────── */}
      <div className="flex flex-col items-center justify-start min-h-[60px] w-full gap-2 mb-2">
        {!drawnCard && (isYourTurn || turnPhase === 'cambia') && (
          <div className="flex gap-2 items-center">
            {turnPhase === 'cambia' && onCambiar ? (
              <>
                <Button
                  id="cambiar-btn"
                  variant={hasCambiaLocked ? 'secondary' : 'primary'}
                  size="sm"
                  disabled={selectedCards.length !== 1}
                  onClick={() => {
                    if (selectedCards.length === 1) onCambiar(selectedCards[0]);
                  }}
                >
                  {hasCambiaLocked
                    ? (lang === 'en' ? 'Update Exchange Card' : 'Actualizar Carta')
                    : (lang === 'en' ? 'Lock In to Pass' : 'Confirmar Cambia')}
                </Button>
                {hasCambiaLocked && (
                  <Button id="uncommit-cambia-btn" variant="danger" size="sm" onClick={() => onCambiar(null)}>
                     {lang === 'en' ? 'Un-commit' : 'Deshacer'}
                  </Button>
                )}
              </>
            ) : (
              (turnPhase === 'offer_discard' || turnPhase === 'meld_or_discard') && (
                <>
                  <Button id="meld-btn" variant="primary" size="sm"
                    disabled={!canMeldNow} onClick={() => onMeld(combinedPayload)}>
                    {meldLabel()}
                  </Button>
                  {turnPhase === 'meld_or_discard' && (
                    <Button id="discard-btn" variant="danger" size="sm"
                      disabled={selectedCards.length !== 1 || !canDiscard} 
                      onClick={() => {
                          if (selectedCards.length === 1 && canDiscard) {
                             onDiscard(selectedCards[0]);
                          }
                      }}>
                      {lang === 'en' ? 'Discard' : 'Descartar'}
                    </Button>
                  )}
                </>
              )
            )}
          </div>
        )}
        
        {/* Phase hint */}
        {!drawnCard && (isYourTurn || turnPhase === 'cambia') && (
          <p className="text-[11px] text-center w-full min-h-[16px]" style={{ color: turnPhase === 'meld_or_discard' ? '#f87171' : '#4b5563' }}>
            {turnPhase === 'cambia'
              ? lang === 'en'
                ? 'La Cambia: Select exactly 1 card to pass to your right'
                : 'La Cambia: Selecciona 1 carta para pasar a tu derecha'
              : turnPhase === 'offer_discard'
              ? lang === 'en'
                ? 'Claim the discard or draw from stock — you may also meld from your hand first'
                : 'Reclama el descarte o roba del mazo — también puedes bajar cartas primero'
              : turnPhase === 'meld_or_discard'
              ? lang === 'en'
                ? 'Select 1 card and click Discard to end your turn — or select cards to meld first'
                : 'Selecciona 1 carta y haz clic en Descartar — o selecciona para bajar primero'
              : ''}
          </p>
        )}
      </div>

      {/* ── Hand label ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <p className="text-xs text-gray-500">{t('yourHand', lang)}</p>
        <p className="text-[10px] text-gray-700">
          {lang === 'en' ? '— drag to reorder' : '— arrastra para reordenar'}
        </p>
      </div>

      {/* ── Hand cards (draggable) ───────────────────────────────────── */}
      <div className="flex flex-nowrap overflow-x-auto overflow-y-visible custom-scrollbar items-center justify-start lg:justify-center gap-0.5 lg:gap-1.5 w-full pb-4 px-1 lg:px-2 max-w-[100vw]">
      {orderedCards.map((card) => {
          const handleCardClick = () => {
            onSelect(card.id);
          };

          return (
            <div
              key={card.id}
              draggable={true}
              onDragStart={(e) => handleDragStart(e, card.id)}
              onDragOver={(e) => handleDragOver(e, card.id)}
              onDrop={handleDrop}
              className={'cursor-grab active:cursor-grabbing shrink-0'}
            >
              <button
                id={`hand-card-${card.id}`}
                onClick={handleCardClick}
                className={`focus:outline-none group relative ${turnPhase === 'cambia' && lockedCambiaCardId === card.id ? 'ring-[3px] ring-blue-500 rounded-lg shadow-[0_0_15px_rgba(59,130,246,0.6)]' : receivedCambiaCardId === card.id ? 'ring-[3px] ring-green-500 rounded-lg shadow-[0_0_20px_rgba(34,197,94,0.6)] transition-all duration-[3000ms]' : ''}`}
              >
                <Card card={card} selected={selectedIds.has(card.id)} size="sm" />
              </button>
            </div>
          );
        })}
        {orderedCards.length === 0 && (
          <p className="text-xs text-gray-600 italic">
            {lang === 'en' ? 'No cards in hand' : 'Sin cartas en mano'}
          </p>
        )}
      </div>
    </div>
  );
}
