'use client';

import React from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { t } from '@/lib/i18n';
import { Player } from '@/lib/supabase';
import PlayerSlot from './PlayerSlot';
import DiscardPile from './DiscardPile';
import { CardType, GameState } from '@/lib/supabase';

interface PokerTableProps {
  activePlayers: Player[];
  spectators: Player[];
  localPlayerId: string;
  gameState: GameState | null;
  melds: Record<string, CardType[][]>;
  timeLeft: number;
  isSpectator: boolean;
  onClaimDiscard: () => void;
  onDraw: () => void;
  onForce: () => void;
  canClaim: boolean;
  canDraw: boolean;
  canForce: boolean;
  onExtendMeld: (playerId: string, meldIndex: number, cardId?: string) => void;
  extendableMelds: Set<number>;
  selectedTableCardIds: Set<string>;
  onSelectTableCard: (cardId: string) => void;
  // Offer system
  offerCountdown: number;
  discardClaims: Record<string, number>;
  localPlayerId2: string; // passed separately to avoid confusion
  forcedCardId?: string | null;
  speakingPlayerIds?: string[];
}

// Map seat positions around the table
// Bottom = local player always, then distribute others
function getPositions(playerCount: number): Array<'top' | 'left' | 'right' | 'bottom'> {
  if (playerCount === 2) return ['bottom', 'top'];
  if (playerCount === 3) return ['bottom', 'top', 'left'];
  return ['bottom', 'top', 'left', 'right'];
}

export default function PokerTable({
  activePlayers,
  spectators,
  localPlayerId,
  gameState,
  melds,
  timeLeft,
  isSpectator,
  onClaimDiscard,
  onDraw,
  onForce,
  canClaim,
  canDraw,
  canForce,
  onExtendMeld,
  extendableMelds,
  selectedTableCardIds,
  onSelectTableCard,
  offerCountdown,
  discardClaims,
  localPlayerId2,
  forcedCardId,
  speakingPlayerIds = [],
}: PokerTableProps) {
  const { lang } = useLanguage();

  // Reorder so local player is always first (bottom)
  const localIdx = activePlayers.findIndex((p) => p.player_id === localPlayerId);
  const orderedPlayers =
    localIdx === -1
      ? activePlayers
      : [activePlayers[localIdx], ...activePlayers.filter((_, i) => i !== localIdx)];

  const positions = getPositions(orderedPlayers.length);

  const topCard = gameState?.discard_pile?.at(-1) ?? null;
  const stockCount = gameState?.stock_pile?.length ?? 0;
  const currentPlayerId = gameState?.current_player_id ?? '';
  const turnPhase = gameState?.turn_phase ?? 'between_turns';
  const meldCounts = gameState?.meld_counts ?? {};

  // Objective tracker
  const localPlayer = activePlayers.find((p) => p.player_id === localPlayerId);
  const localMeldCount = meldCounts[localPlayerId] ?? 0;

  return (
    <div className="relative w-full flex items-center justify-center" style={{ minHeight: '600px' }}>
      {/* The oval table */}
      <div
        className="poker-table relative rounded-[50%] flex items-center justify-center"
        style={{ width: '640px', height: '440px', flexShrink: 0 }}
      >
        {/* Center content */}
        <div className="flex flex-col items-center gap-3 z-10">
          {/* Objective tracker */}
          <div className="text-center">
            <div className="text-amber-400 font-bold text-sm tracking-wide">
              {t('meldToWin', lang, { n: 10 - localMeldCount > 0 ? 10 - localMeldCount : 0 })}
            </div>
            {/* Progress bar */}
            <div className="w-32 h-1.5 bg-green-950 rounded-full mt-1 overflow-hidden">
              <div
                className="h-full bg-amber-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.min((localMeldCount / 10) * 100, 100)}%` }}
              />
            </div>
            <div className="text-xs text-gray-400 mt-0.5">{localMeldCount}/10</div>
          </div>

          {/* Piles */}
          <DiscardPile
            topCard={topCard}
            stockCount={stockCount}
            canClaim={canClaim}
            isActivePlayer={currentPlayerId === localPlayerId}
            lastDiscardBy={gameState?.last_discard_by ?? null}
            localPlayerId={localPlayerId}
            onClaim={onClaimDiscard}
            onDraw={onDraw}
            canDraw={canDraw}
            onForce={onForce}
            canForce={canForce}
            turnPhase={turnPhase}
            offerCountdown={offerCountdown}
            discardClaims={discardClaims}
            allActivePlayers={activePlayers}
          />
        </div>

        {/* Player slots positioned around the oval */}
        {orderedPlayers.map((player, i) => {
          const pos = positions[i];
          const isActive = player.player_id === currentPlayerId;
          const isLocal = player.player_id === localPlayerId;
          const playerMelds = melds[player.player_id] ?? [];

          // Position styles
          const posStyles: Record<string, React.CSSProperties> = {
            bottom: { position: 'absolute', bottom: '-80px', left: '50%', transform: 'translateX(-50%)' },
            top: { position: 'absolute', top: '-80px', left: '50%', transform: 'translateX(-50%)' },
            left: { position: 'absolute', left: '-110px', top: '50%', transform: 'translateY(-50%)' },
            right: { position: 'absolute', right: '-110px', top: '50%', transform: 'translateY(-50%)' },
          };

          return (
            <div key={player.player_id} style={posStyles[pos]}>
              <PlayerSlot
                player={player}
                melds={playerMelds}
                isActive={isActive}
                isLocal={isLocal}
                isConnected={player.is_connected}
                timeLeft={isActive ? timeLeft : 30}
                position={pos}
                extendableMelds={isLocal && isActive ? extendableMelds : new Set()}
                onExtendMeld={(meldIdx, cardId) => onExtendMeld(player.player_id, meldIdx, cardId)}
                isHoldingCard={isActive && turnPhase === 'meld_or_discard'}
                selectableTable={isLocal && isActive && turnPhase === 'meld_or_discard'}
                selectedTableCardIds={isLocal ? selectedTableCardIds : new Set()}
                onSelectTableCard={onSelectTableCard}
                forcedCardId={forcedCardId}
                isSpeaking={speakingPlayerIds.includes(player.display_name)}
              />
            </div>
          );
        })}
      </div>

      {/* Spectators strip */}
      {spectators.length > 0 && (
        <div className="absolute bottom-0 right-0 flex flex-col gap-1 bg-[#1a1a1a]/80 rounded-lg p-2 border border-[#333]">
          <span className="text-xs text-gray-500">{t('watching', lang)}</span>
          <div className="flex gap-1">
            {spectators.map((s) => (
              <div key={s.player_id} className="flex flex-col items-center" title={s.display_name}>
                <span className="text-lg">{s.avatar}</span>
                <span className="text-[9px] text-gray-500 truncate max-w-[40px]">{s.display_name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
