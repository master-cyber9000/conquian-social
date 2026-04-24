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
  onVote: (vote: 'yes' | 'no') => void;
  onProposeBet: (amount: number) => void;
  onStartGame: () => void;
  canStart: boolean;
  localPlayerId: string;
  startLoading?: boolean;
  onFundAccount?: () => Promise<void>;
}

export default function LobbyControls({
  players,
  localPlayer,
  room,
  isHost,
  onVote,
  onProposeBet,
  onStartGame,
  canStart,
  localPlayerId,
  startLoading = false,
  onFundAccount,
}: LobbyControlsProps) {
  const { lang } = useLanguage();
  const [betInput, setBetInput] = useState(
    room.bet_amount > 0 ? room.bet_amount.toFixed(2) : '1.00'
  );
  const [proposing, setProposing] = useState(false);
  const [showFundModal, setShowFundModal] = useState(false);
  const [funding, setFunding] = useState(false);

  const myVote = localPlayer?.vote;
  const betProposed = room.bet_amount > 0;
  const nonHostPlayers = players.filter((p) => p.player_id !== room.host_id);
  const allVotedYes = nonHostPlayers.length > 0 && nonHostPlayers.every((p) => p.vote === 'yes');
  const anyVotedNo = nonHostPlayers.some((p) => p.vote === 'no');
  const pendingVote = nonHostPlayers.filter((p) => p.vote !== 'yes');

  const handlePropose = async () => {
    const amount = parseFloat(betInput);
    if (isNaN(amount) || amount <= 0) return;
    setProposing(true);
    await onProposeBet(amount);
    setProposing(false);
  };

  const StepRow = ({ done, label, pending }: { done: boolean; label: string; pending?: string }) => (
    <div className="flex items-start gap-2.5 py-1">
      <div
        className={`mt-0.5 w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold
          ${done ? 'bg-green-600 text-white' : 'bg-[#333] text-gray-500'}`}
      >
        {done ? '✓' : '·'}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${done ? 'text-green-400' : 'text-gray-300'}`}>{label}</p>
        {!done && pending && <p className="text-xs text-yellow-500 mt-0.5">{pending}</p>}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4 p-5 bg-[#1a1a1a] border border-[#333] rounded-2xl w-full max-w-sm">

      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider">
          {t('waitingToStart', lang)}
        </h3>
      </div>

      {/* ── STEP 1: Propose bet ─────────────────────────────────── */}
      <div className="space-y-2">
        <StepRow
          done={betProposed && !anyVotedNo}
          label={
            betProposed && !anyVotedNo
              ? `${t('betAmount', lang)}: $${room.bet_amount.toFixed(2)} ${lang === 'en' ? 'per player' : 'por jugador'}`
              : lang === 'en'
              ? 'Step 1 — Host proposes a bet'
              : 'Paso 1 — El anfitrión propone una apuesta'
          }
          pending={
            anyVotedNo
              ? lang === 'en'
                ? '👎 Rejected — update the amount and re-propose'
                : '👎 Rechazada — actualiza el monto y vuelve a proponer'
              : undefined
          }
        />

        <div className="pl-6 flex gap-2">
          <div className="relative flex-1 min-w-[80px]">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
            <input
              id="bet-amount-input"
              type="number"
              min="0.25"
              step="0.25"
              value={betInput}
              onChange={(e) => setBetInput(e.target.value)}
              disabled={!isHost}
              className="w-full bg-[#111] border border-[#444] rounded-lg pl-6 pr-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 disabled:opacity-40 disabled:cursor-not-allowed"
            />
          </div>
          {isHost && (
            <Button
              id="propose-bet-btn"
              variant={anyVotedNo ? 'danger' : 'gold'}
              size="sm"
              onClick={handlePropose}
              loading={proposing}
            >
              {betProposed
                ? lang === 'en' ? 'Update' : 'Actualizar'
                : t('proposeBet', lang)}
            </Button>
          )}
          {!isHost && betProposed && (
            <div className="flex items-center">
              <span className="text-xs text-gray-500">
                {lang === 'en' ? 'proposed' : 'propuesto'}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="h-px bg-[#2a2a2a]" />

      {/* ── STEP 2: Approve ────────────────────────────────────── */}
      <div className="space-y-2">
        <StepRow
          done={allVotedYes}
          label={
            allVotedYes
              ? lang === 'en' ? 'All players approved ✓' : 'Todos aprobaron ✓'
              : lang === 'en'
              ? 'Step 2 — Everyone approves the bet'
              : 'Paso 2 — Todos aprueban la apuesta'
          }
          pending={
            betProposed && !allVotedYes
              ? lang === 'en'
                ? `Waiting for: ${pendingVote.map((p) => p.display_name).join(', ')}`
                : `Esperando a: ${pendingVote.map((p) => p.display_name).join(', ')}`
              : !betProposed
              ? lang === 'en' ? 'Waiting for host to propose a bet first' : 'Esperando propuesta del anfitrión'
              : undefined
          }
        />

        {/* Non-host: approve / reject buttons */}
        {!isHost && betProposed && (
          <div className="pl-6 flex gap-2">
            <button
              id="vote-yes-btn"
              onClick={() => {
                if ((localPlayer?.balance ?? 0) < room.bet_amount) {
                  setShowFundModal(true);
                } else {
                  onVote('yes');
                }
              }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all border-2 ${
                myVote === 'yes'
                  ? 'bg-green-700 border-green-500 text-white scale-[1.03] shadow-lg shadow-green-900/40'
                  : 'bg-[#1c1c1c] border-[#333] text-gray-300 hover:border-green-600 hover:text-green-400'
              }`}
            >
              👍 {lang === 'en' ? "I'm In" : 'Voy'}
            </button>
            <button
              id="vote-no-btn"
              onClick={() => onVote('no')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all border-2 ${
                myVote === 'no'
                  ? 'bg-red-800 border-red-600 text-white scale-[1.03]'
                  : 'bg-[#1c1c1c] border-[#333] text-gray-300 hover:border-red-600 hover:text-red-400'
              }`}
            >
              👎 {lang === 'en' ? 'Too Rich' : 'Muy caro'}
            </button>
          </div>
        )}

        {/* Host: per-player vote status */}
        {isHost && nonHostPlayers.length > 0 && (
          <div className="pl-6 flex flex-wrap gap-1.5">
            {nonHostPlayers.map((p) => (
              <div
                key={p.player_id}
                className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs border ${
                  p.vote === 'yes'
                    ? 'bg-green-900/40 border-green-700 text-green-400'
                    : p.vote === 'no'
                    ? 'bg-red-900/40 border-red-700 text-red-400'
                    : 'bg-[#222] border-[#444] text-gray-500'
                }`}
              >
                <span>{p.avatar}</span>
                <span>{p.display_name}</span>
                <span className="ml-0.5">
                  {p.vote === 'yes' ? '👍' : p.vote === 'no' ? '👎' : '…'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Host: no other players yet */}
        {isHost && nonHostPlayers.length === 0 && (
          <p className="pl-6 text-xs text-gray-600">
            {t('waitingForPlayers', lang)}
          </p>
        )}
      </div>

      {/* ── HOST: START GAME ──────────────────────────── */}
      {isHost && (
        <div className="pt-1">
          {canStart ? (
            <Button
              id="start-game-btn"
              variant="gold"
              size="lg"
              fullWidth
              loading={startLoading}
              onClick={onStartGame}
              className="text-base shadow-lg shadow-amber-900/40 ring-2 ring-amber-600/50"
            >
              🎮 {lang === 'en' ? 'Start Game!' : '¡Iniciar Juego!'}
            </Button>
          ) : (
            <div className="bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-3 text-center">
              <p className="text-xs text-gray-500">
                {lang === 'en'
                  ? 'Start unlocks once everyone approves the bet'
                  : 'Inicio se habilita cuando todos aprueben la apuesta'}
              </p>
              <div className="flex justify-center gap-1.5 mt-2">
                <span className={`w-2 h-2 rounded-full transition-colors ${betProposed && !anyVotedNo ? 'bg-green-500' : 'bg-gray-700'}`} />
                <span className={`w-2 h-2 rounded-full transition-colors ${allVotedYes ? 'bg-green-500' : 'bg-gray-700'}`} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Waiting note for non-host once approved */}
      {!isHost && myVote === 'yes' && !allVotedYes && (
        <p className="text-xs text-center text-gray-500">
          {lang === 'en' ? "You're in! Waiting for others…" : '¡Estás dentro! Esperando a los demás…'}
        </p>
      )}
      {!isHost && allVotedYes && (
        <p className="text-xs text-center text-green-500 animate-pulse">
          {lang === 'en' ? '✓ All approved — waiting for host to start' : '✓ Todos aprobaron — esperando al anfitrión'}
        </p>
      )}

      {/* Min players warning */}
      {players.filter(p => !p.is_spectator).length < 2 && (
        <p className="text-xs text-center text-yellow-500">{t('minPlayers', lang)}</p>
      )}

      {/* ── Low Balance Modal ──────────────────────────────────── */}
      {showFundModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm fade-in px-4">
          <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl p-6 w-full max-w-sm text-center shadow-2xl relative">
            <button onClick={() => setShowFundModal(false)} className="absolute top-3 right-4 text-gray-400 hover:text-white text-xl">&times;</button>
            <div className="text-4xl mb-4 text-center">💳</div>
            <h2 className="text-xl font-bold text-white mb-2">{lang === 'en' ? 'Low Balance' : 'Saldo Insuficiente'}</h2>
            <p className="text-sm text-gray-400 mb-6">
              {lang === 'en' 
                ? `You don't have enough funds to cover the $${(room?.bet_amount ?? 0).toFixed(2)} bet.` 
                : `No tienes fondos suficientes para cubrir la apuesta de $${(room?.bet_amount ?? 0).toFixed(2)}.`}
            </p>
            <Button 
              variant="gold" 
              fullWidth 
              loading={funding}
              onClick={async () => {
                if (onFundAccount) {
                  setFunding(true);
                  await onFundAccount();
                  setFunding(false);
                  setShowFundModal(false);
                  onVote('yes');
                } else {
                  setShowFundModal(false);
                }
              }}
            >
              {lang === 'en' ? 'Quick Add $10' : 'Añadir $10'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
