'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useCharacter } from '@/hooks/useCharacter';
import { useLanguage } from '@/hooks/useLanguage';
import { useGameState } from '@/hooks/useGameState';
import { usePlayers } from '@/hooks/usePlayers';
import { useChat } from '@/hooks/useChat';
import { useRoom } from '@/hooks/useRoom';
import { t } from '@/lib/i18n';
import { supabase, CardType, GameState } from '@/lib/supabase';
import {
  buildDeck,
  isValidMeld,
  canExtendMeld,
  findExtendableMelds,
  countMeldedCards,
  nextPlayerClockwise,
  checkWinner,
  calculatePayout,
  dealHands,
} from '@/lib/gameLogic';
import TopBar from '@/components/layout/TopBar';
import PokerTable from '@/components/game/PokerTable';
import CardHand from '@/components/game/CardHand';
import ChatPanel from '@/components/chat/ChatPanel';
import LobbyControls from '@/components/lobby/LobbyControls';
import WinnerSplash from '@/components/game/WinnerSplash';
import DrawSplash from '@/components/game/DrawSplash';
import CharacterCreation from '@/components/character/CharacterCreation';
import Button from '@/components/ui/Button';

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const code = (params.code as string).toUpperCase();
  const { lang } = useLanguage();
  const { profile, loaded, saveProfile } = useCharacter();

  // Core data hooks
  const { room, loading: roomLoading, notFound, updateRoom } = useRoom(code);
  const { players, activePlayers, spectators, loading: playersLoading, updatePlayer } = usePlayers(code);
  const { gameState, updateGameState, initGameState } = useGameState(code);
  const { messages, sendMessage } = useChat(code);

  // Local UI state
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [chatOpen, setChatOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showCharacter, setShowCharacter] = useState(false);
  const [joined, setJoined] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [showWinner, setShowWinner] = useState<string | null>(null);
  const [showDraw, setShowDraw] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Derived
  const localPlayer = players.find((p) => p.player_id === profile?.playerId);
  const isSpectator = localPlayer?.is_spectator ?? true;
  const isHost = room?.host_id === profile?.playerId;
  const myHand: CardType[] = gameState?.hands?.[profile?.playerId ?? ''] ?? [];
  const myMelds: CardType[][] = gameState?.melds?.[profile?.playerId ?? ''] ?? [];
  const currentPlayerId = gameState?.current_player_id ?? '';
  const isMyTurn = currentPlayerId === profile?.playerId && !isSpectator;
  const turnPhase = gameState?.turn_phase ?? 'between_turns';

  // ── Join room on profile load ──────────────────────────────────────────────
  useEffect(() => {
    if (!loaded || !profile || joined || roomLoading || notFound) return;
    joinRoom();
  }, [loaded, profile, joined, roomLoading, notFound]);

  const joinRoom = async () => {
    if (!profile) return;

    // Check if already in players table
    const { data: existing } = await supabase
      .from('players')
      .select('*')
      .eq('room_code', code)
      .eq('player_id', profile.playerId)
      .single();
    if (existing) { setJoined(true); return; }

    // Assign seat or spectator
    const seats = activePlayers.map((p) => p.seat_number).filter(Boolean) as number[];
    const nextSeat = [1, 2, 3, 4].find((s) => !seats.includes(s));
    const isSpec = !nextSeat || room?.status === 'playing';

    await supabase.from('players').insert({
      room_code: code,
      player_id: profile.playerId,
      display_name: profile.displayName,
      avatar: profile.avatar,
      border_color: profile.borderColor,
      seat_number: nextSeat ?? null,
      is_spectator: isSpec,
      balance: 10.00,
      is_ready: false,
      vote: null,
      is_connected: true,
    });
    setJoined(true);
  };

  // ── Turn timer ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!isMyTurn || room?.status !== 'playing') return;

    setTimeLeft(30);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleAutoPass();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isMyTurn, currentPlayerId, room?.status]);

  const handleAutoPass = useCallback(async () => {
    if (!gameState || !profile) return;
    // Auto-discard first card or advance turn
    if (turnPhase === 'offer_discard' || turnPhase === 'draw_or_take') {
      await advanceTurn(gameState);
    } else if (turnPhase === 'meld_or_discard' && myHand.length > 0) {
      const cardToDiscard = myHand[0];
      await doDiscard(cardToDiscard);
    }
  }, [gameState, profile, turnPhase, myHand]);

  // ── Start game ─────────────────────────────────────────────────────────────
  const startGame = async () => {
    if (!room || activePlayers.length < 2) return;
    const deck = buildDeck();
    const pidList = activePlayers.map((p) => p.player_id);
    const { hands, stock } = dealHands(deck, pidList, 9);
    const emptyMelds: Record<string, CardType[][]> = {};
    pidList.forEach((pid) => (emptyMelds[pid] = []));
    const meldCounts: Record<string, number> = {};
    pidList.forEach((pid) => (meldCounts[pid] = 0));

    // Draw first discard
    const firstDiscard = stock.shift()!;

    const gs: GameState = {
      room_code: code,
      deck,
      hands,
      melds: emptyMelds,
      discard_pile: [firstDiscard],
      stock_pile: stock,
      current_player_id: pidList[0],
      turn_phase: 'offer_discard',
      round_number: 1,
      meld_counts: meldCounts,
    };

    await initGameState(gs);
    await updateRoom({ status: 'playing' });
  };

  // ── Claim discard ──────────────────────────────────────────────────────────
  const handleClaimDiscard = async () => {
    if (!gameState || !profile) return;
    const topCard = gameState.discard_pile.at(-1);
    if (!topCard) return;

    // Add card to hand temporarily — player must meld it
    const updatedHand = [...(gameState.hands[profile.playerId] ?? []), topCard];
    const updatedDiscard = gameState.discard_pile.slice(0, -1);

    await updateGameState({
      hands: { ...gameState.hands, [profile.playerId]: updatedHand },
      discard_pile: updatedDiscard,
      turn_phase: 'meld_or_discard',
      current_player_id: profile.playerId,
    });
    setSelectedCards(new Set());
  };

  // ── Draw from stock ─────────────────────────────────────────────────────────
  const handleDraw = async () => {
    if (!gameState || !profile) return;
    if (gameState.stock_pile.length === 0) {
      // Draw: pot doubles
      const newPot = (room?.pot ?? 0) * 2;
      await updateRoom({ pot: newPot, status: 'lobby' });
      setShowDraw(true);
      return;
    }
    const [drawn, ...newStock] = gameState.stock_pile;
    const updatedHand = [...(gameState.hands[profile.playerId] ?? []), drawn];

    await updateGameState({
      hands: { ...gameState.hands, [profile.playerId]: updatedHand },
      stock_pile: newStock,
      turn_phase: 'meld_or_discard',
    });
    setSelectedCards(new Set());
  };

  // ── Meld selected cards ────────────────────────────────────────────────────
  const handleMeld = async () => {
    if (!gameState || !profile || !isMyTurn) return;
    const selected = myHand.filter((c) => selectedCards.has(c.id));
    if (selected.length < 3 || !isValidMeld(selected)) return;

    const remainingHand = myHand.filter((c) => !selectedCards.has(c.id));
    const existingMelds = gameState.melds[profile.playerId] ?? [];
    const newMelds = [...existingMelds, selected];
    const newMeldCount = countMeldedCards(newMelds);

    const updatedMelds = { ...gameState.melds, [profile.playerId]: newMelds };
    const updatedCounts = { ...gameState.meld_counts, [profile.playerId]: newMeldCount };

    // Check win
    const updatedHands = { ...gameState.hands, [profile.playerId]: remainingHand };
    const winner = checkWinner(updatedMelds, updatedHands);

    if (winner || newMeldCount >= 10) {
      // Game over
      const { net } = calculatePayout(room?.pot ?? 0);
      await updateGameState({
        hands: updatedHands,
        melds: updatedMelds,
        meld_counts: updatedCounts,
        turn_phase: 'between_turns',
      });
      await updateRoom({ status: 'finished' });
      setShowWinner(winner ?? profile.playerId);
      setSelectedCards(new Set());
      return;
    }

    await updateGameState({
      hands: updatedHands,
      melds: updatedMelds,
      meld_counts: updatedCounts,
      turn_phase: 'meld_or_discard',
    });
    setSelectedCards(new Set());
  };

  // ── Extend existing meld ───────────────────────────────────────────────────
  const handleExtendMeld = async (targetPlayerId: string, meldIndex: number) => {
    if (!gameState || !profile || !isMyTurn) return;
    const selected = myHand.filter((c) => selectedCards.has(c.id));
    if (selected.length !== 1) return;
    const card = selected[0];
    const targetMelds = gameState.melds[targetPlayerId] ?? [];
    const meld = targetMelds[meldIndex];
    if (!meld || !canExtendMeld(meld, card)) return;

    const newMeld = [...meld, card];
    const newMelds = [...targetMelds];
    newMelds[meldIndex] = newMeld;
    const remainingHand = myHand.filter((c) => c.id !== card.id);
    const newCount = countMeldedCards(newMelds);

    await updateGameState({
      hands: { ...gameState.hands, [profile.playerId]: remainingHand },
      melds: { ...gameState.melds, [targetPlayerId]: newMelds },
      meld_counts: { ...gameState.meld_counts, [targetPlayerId]: newCount },
    });
    setSelectedCards(new Set());
  };

  // ── Discard a card ─────────────────────────────────────────────────────────
  const handleDiscard = async () => {
    if (!gameState || !profile || !isMyTurn || selectedCards.size !== 1) return;
    const cardId = [...selectedCards][0];
    const card = myHand.find((c) => c.id === cardId);
    if (!card) return;
    await doDiscard(card);
  };

  const doDiscard = async (card: CardType) => {
    if (!gameState || !profile) return;
    const remainingHand = myHand.filter((c) => c.id !== card.id);
    const newDiscard = [...gameState.discard_pile, card];
    const pidList = activePlayers.map((p) => p.player_id);
    const nextPid = nextPlayerClockwise(pidList, profile.playerId);

    await updateGameState({
      hands: { ...gameState.hands, [profile.playerId]: remainingHand },
      discard_pile: newDiscard,
      current_player_id: nextPid,
      turn_phase: 'offer_discard',
    });
    setSelectedCards(new Set());
  };

  const advanceTurn = async (gs: GameState) => {
    const pidList = activePlayers.map((p) => p.player_id);
    const nextPid = nextPlayerClockwise(pidList, gs.current_player_id);
    await updateGameState({
      current_player_id: nextPid,
      turn_phase: 'draw_or_take',
    });
  };

  // ── Force ──────────────────────────────────────────────────────────────────
  const handleForce = async () => {
    if (!gameState || !profile) return;
    const topCard = gameState.discard_pile.at(-1);
    if (!topCard) return;
    const activeMelds = gameState.melds[currentPlayerId] ?? [];
    const extendable = findExtendableMelds(activeMelds, topCard);
    if (extendable.length === 0) return;

    // Add card to current player's hand and force them to meld
    const updatedHand = [...(gameState.hands[currentPlayerId] ?? []), topCard];
    const updatedDiscard = gameState.discard_pile.slice(0, -1);

    await updateGameState({
      hands: { ...gameState.hands, [currentPlayerId]: updatedHand },
      discard_pile: updatedDiscard,
      turn_phase: 'meld_or_discard',
    });
  };

  // ── Meld extendability for local player ───────────────────────────────────
  const extendableMelds = new Set<number>();
  if (isMyTurn && selectedCards.size === 1) {
    const cardId = [...selectedCards][0];
    const card = myHand.find((c) => c.id === cardId);
    if (card) {
      findExtendableMelds(myMelds, card).forEach((i) => extendableMelds.add(i));
    }
  }

  // ── Force availability ─────────────────────────────────────────────────────
  const topCard = gameState?.discard_pile?.at(-1);
  const canForce = Boolean(
    !isMyTurn &&
    isSpectator === false &&
    topCard &&
    gameState &&
    findExtendableMelds(gameState.melds[currentPlayerId] ?? [], topCard).length > 0 &&
    turnPhase === 'offer_discard'
  );

  const canClaim =
    !isMyTurn &&
    turnPhase === 'offer_discard' &&
    !isSpectator &&
    joined;

  const canDraw =
    isMyTurn &&
    (turnPhase === 'draw_or_take' || turnPhase === 'offer_discard');

  // ── Ready / vote ───────────────────────────────────────────────────────────
  const handleReady = async (ready: boolean) => {
    if (!profile) return;
    await updatePlayer(profile.playerId, { is_ready: ready });
  };

  const handleVote = async (vote: 'yes' | 'no') => {
    if (!profile) return;
    await updatePlayer(profile.playerId, { vote });
  };

  const handleProposeBet = async (amount: number) => {
    await updateRoom({ bet_amount: amount, pot: amount * activePlayers.length });
    // Reset votes
    for (const p of activePlayers) {
      await updatePlayer(p.player_id, { vote: null });
    }
  };

  const canStart =
    activePlayers.length >= 2 &&
    activePlayers.every((p) => p.is_ready) &&
    (activePlayers.every((p) => p.vote === 'yes') || isHost) &&
    (room?.bet_amount ?? 0) > 0;

  // ── Play again ─────────────────────────────────────────────────────────────
  const handlePlayAgain = async () => {
    setShowWinner(null);
    for (const p of activePlayers) {
      await updatePlayer(p.player_id, { is_ready: false, vote: null });
    }
    await updateRoom({ status: 'lobby' });
  };

  const handleNewBet = async () => {
    setShowWinner(null);
    await updateRoom({ status: 'lobby', bet_amount: 0, pot: 0 });
    for (const p of activePlayers) {
      await updatePlayer(p.player_id, { is_ready: false, vote: null });
    }
  };

  // ── Toggle card selection ──────────────────────────────────────────────────
  const toggleCard = (cardId: string) => {
    setSelectedCards((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (!loaded) return null;

  if (!profile && loaded) {
    return (
      <CharacterCreation
        open={true}
        onComplete={(data) => { saveProfile(data); }}
      />
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-xl text-red-400">{t('roomNotFound', lang)}</p>
        <Button variant="ghost" onClick={() => router.push('/')}>{lang === 'en' ? 'Back Home' : 'Inicio'}</Button>
      </div>
    );
  }

  const winnerPlayer = showWinner ? players.find((p) => p.player_id === showWinner) : null;

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex flex-col overflow-hidden">
      <TopBar
        roomCode={code}
        balance={localPlayer?.balance}
        pot={room?.pot}
        isMuted={isMuted}
        onMuteToggle={() => setIsMuted((m) => !m)}
        isSpectator={isSpectator}
      />

      <div className={`flex-1 flex flex-col mt-[57px] ${chatOpen ? 'mr-72' : ''} transition-[margin] duration-300`}>
        {/* Turn indicator */}
        {room?.status === 'playing' && (
          <div className="text-center py-1.5">
            {isMyTurn ? (
              <span className="chip chip-gold animate-pulse">{t('yourTurn', lang)} — {timeLeft}s</span>
            ) : (
              <span className="text-xs text-gray-500">
                {players.find((p) => p.player_id === currentPlayerId)?.display_name}&apos;s turn
              </span>
            )}
          </div>
        )}

        {/* Main table area */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 gap-4 py-6">
          {/* LOBBY */}
          {room?.status === 'lobby' && (
            <div className="flex flex-col lg:flex-row gap-6 items-center w-full max-w-4xl">
              {/* Visual table preview (even in lobby) */}
              <div className="flex-1 flex items-center justify-center min-h-[400px]">
                <PokerTable
                  activePlayers={activePlayers}
                  spectators={spectators}
                  localPlayerId={profile?.playerId ?? ''}
                  gameState={gameState}
                  melds={{}}
                  timeLeft={30}
                  isSpectator={isSpectator}
                  onClaimDiscard={() => {}}
                  onDraw={() => {}}
                  onForce={() => {}}
                  canClaim={false}
                  canDraw={false}
                  canForce={false}
                  onExtendMeld={() => {}}
                  extendableMelds={new Set()}
                />
              </div>

              {/* Lobby controls */}
              {!isSpectator && localPlayer && room && (
                <LobbyControls
                  players={activePlayers}
                  localPlayer={localPlayer}
                  room={room}
                  isHost={isHost}
                  onReady={handleReady}
                  onVote={handleVote}
                  onProposeBet={handleProposeBet}
                  onStartGame={startGame}
                  canStart={canStart}
                  localPlayerId={profile?.playerId ?? ''}
                />
              )}

              {isSpectator && (
                <div className="flex flex-col items-center gap-3 p-6 bg-[#1a1a1a] border border-[#333] rounded-xl">
                  <span className="text-2xl">👁️</span>
                  <p className="text-sm text-gray-400">{t('youAreSpectator', lang)}</p>
                  <Button
                    id="join-next-round-btn"
                    variant="ghost"
                    onClick={async () => {
                      if (!profile) return;
                      const seats = activePlayers.map((p) => p.seat_number).filter(Boolean) as number[];
                      const nextSeat = [1, 2, 3, 4].find((s) => !seats.includes(s));
                      if (nextSeat) {
                        await updatePlayer(profile.playerId, { is_spectator: false, seat_number: nextSeat });
                      }
                    }}
                  >
                    {t('joinNextRound', lang)}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* PLAYING */}
          {room?.status === 'playing' && gameState && (
            <div className="flex flex-col items-center gap-4 w-full max-w-4xl">
              <PokerTable
                activePlayers={activePlayers}
                spectators={spectators}
                localPlayerId={profile?.playerId ?? ''}
                gameState={gameState}
                melds={gameState.melds ?? {}}
                timeLeft={timeLeft}
                isSpectator={isSpectator}
                onClaimDiscard={handleClaimDiscard}
                onDraw={handleDraw}
                onForce={handleForce}
                canClaim={canClaim}
                canDraw={canDraw}
                canForce={canForce}
                onExtendMeld={handleExtendMeld}
                extendableMelds={extendableMelds}
              />

              {/* Local player hand */}
              {!isSpectator && (
                <div className="w-full max-w-2xl">
                  <CardHand
                    cards={myHand}
                    selectedIds={selectedCards}
                    onSelect={toggleCard}
                    onMeld={handleMeld}
                    onDiscard={handleDiscard}
                    canMeld={isMyTurn}
                    canDiscard={isMyTurn && turnPhase === 'meld_or_discard'}
                    isYourTurn={isMyTurn}
                    turnPhase={turnPhase}
                  />
                </div>
              )}

              {isSpectator && (
                <div className="text-center">
                  <span className="chip chip-gold">{t('spectating', lang)}</span>
                </div>
              )}
            </div>
          )}

          {/* FINISHED (before winner splash shows) */}
          {room?.status === 'finished' && !showWinner && (
            <div className="text-center space-y-3">
              <p className="text-gray-400">{lang === 'en' ? 'Game over' : 'Juego terminado'}</p>
              <Button variant="primary" onClick={handlePlayAgain}>{t('playAgain', lang)}</Button>
            </div>
          )}
        </div>
      </div>

      {/* Chat Panel */}
      <ChatPanel
        messages={messages}
        onSendMessage={(content) => {
          if (!profile) return;
          sendMessage(content, {
            playerId: profile.playerId,
            displayName: profile.displayName,
            avatar: profile.avatar,
          });
        }}
        pot={room?.pot ?? 0}
        betAmount={room?.bet_amount ?? 0}
        spectators={spectators}
        isCollapsed={!chatOpen}
        onToggle={() => setChatOpen((o) => !o)}
      />

      {/* Winner splash */}
      {winnerPlayer && room && (
        <WinnerSplash
          winner={winnerPlayer}
          allPlayers={activePlayers}
          pot={room.pot}
          isLocalWinner={winnerPlayer.player_id === profile?.playerId}
          onPlayAgain={handlePlayAgain}
          onNewBet={handleNewBet}
        />
      )}

      {/* Draw splash */}
      {showDraw && (
        <DrawSplash
          newPot={room?.pot ?? 0}
          onContinue={async () => {
            setShowDraw(false);
            // Re-deal for new round
            await handlePlayAgain();
          }}
        />
      )}
    </div>
  );
}
