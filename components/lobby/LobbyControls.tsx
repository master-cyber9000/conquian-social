'use client';

import { useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { t } from '@/lib/i18n';
import { Player } from '@/lib/supabase';
import Button from '@/components/ui/Button';

interface LobbyControlsProps {
  players: Player[];
  localPlayer: Player | null;
  room: { bet_amount: number; host_id: string };
  isHost: boolean;
  onReady: (ready: boolean) => void;
  onVote: (vote: 'yes' | 'no') => void;
  onProposeBet: (amount: number) => void;
  onStartGame: () => void;
  canStart: boolean;
  localPlayerId: string;
}

export default function LobbyControls({
  players,
  localPlayer,
  room,
  isHost,
  onReady,
  onVote,
  onProposeBet,
  onStartGame,
  canStart,
  localPlayerId,
}: LobbyControlsProps) {
  const { lang } = useLanguage();
  const [betInput, setBetInput] = useState(room.bet_amount?.toString() ?? '1');
  const [proposing, setProposing] = useState(false);

  const isReady = localPlayer?.is_ready ?? false;
  const myVote = localPlayer?.vote;

  const votesYes = players.filter((p) => p.vote === 'yes').length;
  const votesNo = players.filter((p) => p.vote === 'no').length;
  const activePlayers = players.filter((p) => !p.is_spectator);

  const handlePropose = async () => {
    const amount = parseFloat(betInput);
    if (isNaN(amount) || amount <= 0) return;
    setProposing(true);
    await onProposeBet(amount);
    setProposing(false);
  };

  return (
    <div className="flex flex-col gap-4 p-4 bg-[#1a1a1a] border border-[#333] rounded-xl max-w-sm">
      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
        {t('waitingToStart', lang)}
      </h3>

      {/* Bet section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">{t('betAmount', lang)}</span>
          {room.bet_amount > 0 && (
            <span className="chip chip-gold">${room.bet_amount.toFixed(2)}</span>
          )}
        </div>

        {isHost ? (
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                id="bet-amount-input"
                type="number"
                min="0.25"
                step="0.25"
                value={betInput}
                onChange={(e) => setBetInput(e.target.value)}
                className="w-full bg-[#111] border border-[#444] rounded-lg pl-6 pr-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <Button
              id="propose-bet-btn"
              variant="gold"
              size="sm"
              onClick={handlePropose}
              loading={proposing}
            >
              {t('proposeBet', lang)}
            </Button>
          </div>
        ) : (
          room.bet_amount > 0 && (
            <div className="flex gap-2">
              <Button
                id="vote-yes-btn"
                variant={myVote === 'yes' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => onVote('yes')}
                className="flex-1"
              >
                👍 {t('votesFor', lang)} ({votesYes})
              </Button>
              <Button
                id="vote-no-btn"
                variant={myVote === 'no' ? 'danger' : 'ghost'}
                size="sm"
                onClick={() => onVote('no')}
                className="flex-1"
              >
                👎 {t('votesAgainst', lang)} ({votesNo})
              </Button>
            </div>
          )
        )}
      </div>

      {/* Player list */}
      <div className="space-y-1.5">
        {activePlayers.map((p) => (
          <div key={p.player_id} className="flex items-center justify-between py-1 border-b border-[#2a2a2a] last:border-0">
            <div className="flex items-center gap-2">
              <span className="text-base">{p.avatar}</span>
              <span className="text-sm text-white">{p.display_name}</span>
              {p.player_id === room.host_id && (
                <span className="chip chip-gold text-[10px]">{t('host', lang)}</span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {p.vote && (
                <span className="text-base">{p.vote === 'yes' ? '👍' : '👎'}</span>
              )}
              {p.is_ready && (
                <span className="chip chip-green text-[10px]">{t('ready', lang)}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Minimum players warning */}
      {activePlayers.length < 2 && (
        <p className="text-xs text-center text-yellow-500">{t('minPlayers', lang)}</p>
      )}

      {/* Ready button */}
      <Button
        id="ready-toggle-btn"
        variant={isReady ? 'danger' : 'primary'}
        fullWidth
        onClick={() => onReady(!isReady)}
        disabled={!room.bet_amount}
      >
        {isReady ? `✓ ${t('ready', lang)}` : t('ready', lang)}
      </Button>

      {/* Start game (host only) */}
      {isHost && canStart && (
        <Button
          id="start-game-btn"
          variant="gold"
          fullWidth
          onClick={onStartGame}
        >
          {t('allReadyToStart', lang)}
        </Button>
      )}
    </div>
  );
}
