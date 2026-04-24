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
  sortMeld,
  canExtendMeld,
  canExtendMeldMulti,
  findMultiCardExtensions,
  findExtendableMelds,
  countMeldedCards,
  nextPlayerClockwise,
  checkWinner,
  calculatePayout,
  extractCardsFromMeld,
  dealHands,
  resolveDiscardClaim,
  OFFER_WINDOW_MS,
  findAllForceTargets,
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
import { LiveKitRoom, RoomAudioRenderer, useLocalParticipant, useParticipants } from '@livekit/components-react';

function VoiceController({ isMuted, onSpeakingUpdate }: { isMuted: boolean; onSpeakingUpdate: (ids: string[]) => void }) {
  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();

  useEffect(() => {
    if (localParticipant) {
      localParticipant.setMicrophoneEnabled(!isMuted).catch(console.error);
    }
  }, [isMuted, localParticipant]);

  useEffect(() => {
    const speakers = participants.filter(p => p.isSpeaking).map(p => p.identity);
    onSpeakingUpdate(speakers);
  }, [participants, onSpeakingUpdate]);

  return null;
}

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const code = (params.code as string).toUpperCase();
  const { lang } = useLanguage();
  const { profile, loaded, saveProfile } = useCharacter();

  const { room, loading: roomLoading, notFound, updateRoom } = useRoom(code);
  const { players, activePlayers, spectators, loading: playersLoading, updatePlayer } = usePlayers(code);
  const { gameState, updateGameState, initGameState } = useGameState(code);
  const { messages, sendMessage } = useChat(code);

  // ── Local UI state ────────────────────────────────────────────────────────
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [selectedTableCards, setSelectedTableCards] = useState<Set<string>>(new Set());

  const toggleTableCard = (cardId: string) => {
    setSelectedTableCards((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  };

  const [chatOpen, setChatOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isDeafened, setIsDeafened] = useState(false);
  const [speakingIds, setSpeakingIds] = useState<string[]>([]);
  const [joined, setJoined] = useState(false);
  const [showWinner, setShowWinner] = useState<string | null>(null);
  const [showDraw, setShowDraw] = useState(false);
  const [startLoading, setStartLoading] = useState(false);
  const [startError, setStartError] = useState('');

  // Drawn/claimed card staging — stays here until player melds or discards it
  const [drawnCard, setDrawnCard] = useState<CardType | null>(null);
  const [drawnCardSource, setDrawnCardSource] = useState<'stock' | 'discard' | null>(null);

  // Offer countdown (local display only, driven by gameState.offer_deadline)
  const [offerCountdown, setOfferCountdown] = useState(0);

  const offerTimerRef = useRef<NodeJS.Timeout | null>(null);
  const resolveCalledRef = useRef(false); // guard against double-resolve

  // ── Derived ───────────────────────────────────────────────────────────────
  const localPlayer = players.find((p) => p.player_id === profile?.playerId);
  const isSpectator = localPlayer?.is_spectator ?? true;
  const isHost = room?.host_id === profile?.playerId;
  const myHand: CardType[] = gameState?.hands?.[profile?.playerId ?? ''] ?? [];
  const myMelds: CardType[][] = gameState?.melds?.[profile?.playerId ?? ''] ?? [];
  const currentPlayerId = gameState?.current_player_id ?? '';
  const isFolded = myHand.length === 10;
  const isMyTurn = currentPlayerId === profile?.playerId && !isSpectator && !isFolded;
  const turnPhase = gameState?.turn_phase ?? 'between_turns';
  const myClaim = profile?.playerId ? (gameState?.discard_claims ?? {})[profile.playerId] : undefined;
  const hasClaimed = !!myClaim;

  // ── Join room ─────────────────────────────────────────────────────────────
  const [liveKitToken, setLiveKitToken] = useState<string | null>(null);

  useEffect(() => {
    if (!loaded || !profile || joined || roomLoading || notFound) return;
    joinRoom();

    // Spawn synchronous VoIP Token negotiation
    const authorizeVoice = async () => {
      try {
        const res = await fetch('/api/livekit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ room: code, participantName: profile.displayName })
        });
        const data = await res.json();
        if (data.token) setLiveKitToken(data.token);
      } catch (err) {
        console.error('Failed to securely authenticate voice gateway', err);
      }
    };
    authorizeVoice();
  }, [loaded, profile, joined, roomLoading, notFound]);

  const joinRoom = async () => {
    if (!profile) return;
    const { data: existing } = await supabase
      .from('players').select('*')
      .eq('room_code', code).eq('player_id', profile.playerId).single();
    if (existing) { setJoined(true); return; }

    const seats = activePlayers.map((p) => p.seat_number).filter(Boolean) as number[];
    const nextSeat = [1, 2, 3, 4].find((s) => !seats.includes(s));
    const isSpec = !nextSeat || room?.status === 'playing';

    await supabase.from('players').insert({
      room_code: code, player_id: profile.playerId,
      display_name: profile.displayName, avatar: profile.avatar,
      border_color: profile.borderColor, seat_number: nextSeat ?? null,
      is_spectator: isSpec, balance: 10.00,
      is_ready: false, vote: null, is_connected: true,
    });
    setJoined(true);
  };

  // (30-second per-turn timer removed — players take their time)

  // ── Global Event Syncs ────────────────────────────────────────────────────
  const prevDrawStatusRef = useRef(false);
  useEffect(() => {
    const isStalemate = room?.status === 'lobby' && gameState?.stock_pile?.length === 0;
    if (isStalemate && !prevDrawStatusRef.current) {
      setShowDraw(true);
    }
    prevDrawStatusRef.current = isStalemate;
  }, [room?.status, gameState?.stock_pile?.length]);

  const prevWinnerStatusRef = useRef(false);
  useEffect(() => {
    const isWon = room?.status === 'finished';
    if (isWon && !prevWinnerStatusRef.current) {
       const wId = Object.keys(gameState?.melds ?? {}).find((pid) => countMeldedCards(gameState!.melds[pid]!) >= 10);
       if (wId) setShowWinner(wId);
    }
    prevWinnerStatusRef.current = isWon;
  }, [room?.status, gameState?.melds]);

  const lastLocalMeldRef = useRef<number>(0);

  const prevMeldsRef = useRef<Record<string, CardType[][]>>({});
  const [forcedCardId, setForcedCardId] = useState<string | null>(null);

  useEffect(() => {
    if (!gameState?.melds || !profile) return;
    const currentMyMelds = gameState.melds[profile.playerId] ?? [];
    const prevMyMelds = prevMeldsRef.current[profile.playerId] ?? [];
    
    // Compare array of ids to detect new cards added externally to the array
    const currentCards = currentMyMelds.flat().map(c => c.id);
    const prevCards = prevMyMelds.flat().map(c => c.id);
    const newCardId = currentCards.find(id => !prevCards.includes(id));

    if (turnPhase === 'meld_or_discard' && !drawnCard && !gameState.pending_claim_card && isMyTurn) {
        if (newCardId && Date.now() - lastLocalMeldRef.current > 1500) setForcedCardId(newCardId);
    } else {
        setForcedCardId(null);
    }
    prevMeldsRef.current = gameState.melds;
  }, [gameState?.melds, turnPhase, drawnCard, gameState?.pending_claim_card, isMyTurn, profile?.playerId]);

  // (Offer resolution timers have been removed. Offers stay open until the active player draws.)

  // ── Winner pickup: if pending_claim_card is for me, take it into staging ──
  useEffect(() => {
    if (!isMyTurn || turnPhase !== 'meld_or_discard') return;
    if (!gameState?.pending_claim_card || drawnCard) return;

    // I won the discard offer — put the card into my staging area
    setDrawnCard(gameState.pending_claim_card);
    setDrawnCardSource('discard');
    // Clear it from game state so others don't see it as pending
    updateGameState({ pending_claim_card: null });
  }, [isMyTurn, turnPhase, gameState?.pending_claim_card, drawnCard]);

  // ── Start game ────────────────────────────────────────────────────────────
  const startGame = async () => {
    if (!room || activePlayers.length < 2) return;
    setStartLoading(true); setStartError('');
    const deck = buildDeck();
    const pidList = activePlayers.map((p) => p.player_id);
    const { hands, stock } = dealHands(deck, pidList, 9);
    const emptyMelds: Record<string, CardType[][]> = {};
    pidList.forEach((pid) => (emptyMelds[pid] = []));
    const meldCounts: Record<string, number> = {};
    pidList.forEach((pid) => (meldCounts[pid] = 0));
    const stockCopy = [...stock];

    // Core game state (columns that have always existed)
    const gs = {
      room_code: code, deck, hands, melds: emptyMelds,
      discard_pile: [], stock_pile: stockCopy,
      current_player_id: pidList[0], turn_phase: 'cambia' as const,
      round_number: 1, meld_counts: meldCounts,
    };

    const gsError = await initGameState(gs as unknown as GameState);
    if (gsError) { setStartError(`Failed to initialize game: ${gsError.message}`); setStartLoading(false); return; }

    // Apply timed-offer columns separately (requires SQL migration to have been run)
    // If these columns don't exist yet, this will fail silently and the offer system
    // simply won't be active until the migration is applied.
    await updateGameState({
      offer_deadline: Date.now() + OFFER_WINDOW_MS,
      discard_claims: {},
      pending_claim_card: null,
      last_discard_by: null,
    }).catch(() => {/* migration not yet applied — offer timer disabled this session */});

    const playingCount = activePlayers.filter(p => !p.is_spectator).length;
    const roomError = await updateRoom({ status: 'playing', pot: (room.pot || 0) + ((room.bet_amount ?? 0) * playingCount) });
    if (roomError) { setStartError(`Failed to start game: ${roomError.message}`); setStartLoading(false); return; }
    
    // Natively deduct buy-in right at execution start rather than deferring it to explicitly handle Tie cycles cleanly
    for (const p of activePlayers) {
      if (!p.is_spectator) {
        await updatePlayer(p.player_id, { balance: Math.max(0, p.balance - (room.bet_amount ?? 0)) });
      }
    }
    
    setStartLoading(false);
  };

  // ── Claim the discard (Instantly hijack turn - FCFS) ──────────────────────
  const handleClaimDiscard = async () => {
    if (!gameState || !profile || !joined) return;
    const topCard = gameState.discard_pile.at(-1);
    if (!topCard) return;

    // FCFS: Instantly grab the card and the turn
    const updatedDiscard = gameState.discard_pile.slice(0, -1);
    await updateGameState({
      discard_pile: updatedDiscard,
      current_player_id: profile.playerId,
      turn_phase: 'meld_or_discard',
      offer_deadline: null,
      discard_claims: {},
      pending_claim_card: null,
    });
    setDrawnCard(topCard);
    setDrawnCardSource('discard');
    setSelectedCards(new Set());
  };

  // ── Return grabbed discard to the table ───────────────────────────────────
  const handleReturnDiscard = async () => {
    if (!gameState || !profile || !drawnCard || drawnCardSource !== 'discard') return;

    const basePidList = activePlayers.filter((p) => !p.is_spectator).map((p) => p.player_id);
    const foldedPids = basePidList.filter((id) => (gameState.hands[id]?.length ?? 0) === 10);
    const rightfulPlayerId = gameState.last_discard_by
      ? nextPlayerClockwise(basePidList, gameState.last_discard_by, foldedPids)
      : profile.playerId;

    await updateGameState({
      discard_pile: [...gameState.discard_pile, drawnCard],
      current_player_id: rightfulPlayerId,
      turn_phase: 'offer_discard',
    });

    setDrawnCard(null);
    setDrawnCardSource(null);
    setSelectedCards(new Set());
  };

  // ── Draw from stock ───────────────────────────────────────────────────────
  const handleDraw = async () => {
    if (!gameState || !profile) return;
    
    // (If the active player draws, they simply pull from stock)
    if (gameState.stock_pile.length === 0) {
      await updateRoom({ status: 'lobby' });
      setShowDraw(true); return;
    }

    const [drawn, ...newStock] = gameState.stock_pile;
    // Core update — remove from stock and advance phase
    const drawErr = await updateGameState({
      stock_pile: newStock,
      turn_phase: 'meld_or_discard',
    });
    if (drawErr) { console.error('[handleDraw] failed:', drawErr); return; }

    // Offer-system reset — fails gracefully if migration not yet applied
    await updateGameState({ offer_deadline: null, discard_claims: {} })
      .catch(() => {});

    setDrawnCard(drawn);
    setDrawnCardSource('stock');
    setSelectedCards(new Set());
  };

  // ── Discard the staged drawn card (stock only) ────────────────────────────
  const discardDrawnCardInternal = async (card: CardType) => {
    if (!gameState || !profile) return;
    const basePidList = activePlayers.filter((p) => !p.is_spectator).map((p) => p.player_id);
    const foldedPids = basePidList.filter((id) => (gameState.hands[id]?.length ?? 0) === 10);
    const nextPid = nextPlayerClockwise(basePidList, profile.playerId, foldedPids);

    // Core update — put the card on the discard pile and pass the turn
    const err = await updateGameState({
      discard_pile: [...gameState.discard_pile, card],
      current_player_id: nextPid,
      turn_phase: nextPid === profile.playerId ? 'draw_or_take' : 'offer_discard',
    });
    if (err) { console.error('[discardDrawnCard] failed:', err); return; }

    // Offer-system columns — fails gracefully if migration not yet applied
    await updateGameState({
      offer_deadline: Date.now() + OFFER_WINDOW_MS,
      discard_claims: {},
      last_discard_by: profile.playerId,
    }).catch(() => {});

    setDrawnCard(null); setDrawnCardSource(null); setSelectedCards(new Set());
  };

  const handleDiscardDrawnCard = () => {
    if (drawnCard && drawnCardSource === 'stock') discardDrawnCardInternal(drawnCard);
  };

  // ── La Cambia: Lock in a card to pass to your right ───────────────────────
  const handleCambiar = async (card: CardType | null) => {
    if (!gameState || !profile) return;
    
    const newClaims = { ...(gameState.discard_claims ?? {}) };
    if (card === null) {
      delete newClaims[profile.playerId];
    } else {
      newClaims[profile.playerId] = card;
    }
    await updateGameState({ discard_claims: newClaims });
    setSelectedCards(new Set());
  };

  // ── La Cambia Resolution ──────────────────────────────────────────────────
  useEffect(() => {
    if (!gameState || gameState.turn_phase !== 'cambia') return;

    const claims = gameState.discard_claims ?? {};
    const pidList = activePlayers.map((p) => p.player_id);

    // If everyone has locked in their card
    if (pidList.length >= 2 && Object.keys(claims).length === pidList.length) {
      // Only the current player (Player 1) processes the exchange to avoid race conditions
      if (gameState.current_player_id === profile?.playerId) {
        processCambiaExchange(claims, pidList);
      }
    }
  }, [gameState?.turn_phase, gameState?.discard_claims, activePlayers, profile?.playerId]);

  const processCambiaExchange = async (claims: Record<string, any>, pidList: string[]) => {
    if (!gameState) return;
    const newHands = { ...gameState.hands };

    pidList.forEach((pid) => {
      const cardToGive: CardType = claims[pid];
      // Remove card from my hand
      newHands[pid] = newHands[pid].filter(c => c.id !== cardToGive.id);
    });

    // Add cards received from Left neighbors (since everyone passes to their Right)
    pidList.forEach((pid) => {
      const myIdx = pidList.indexOf(pid);
      const leftIdx = (myIdx + 1) % pidList.length;
      const leftPid = pidList[leftIdx];
      const cardToReceive: CardType = claims[leftPid];

      newHands[pid].push(cardToReceive);
    });

    // Complete the exchange and start the actual game
    await updateGameState({
      hands: newHands,
      discard_claims: {},
      turn_phase: 'offer_discard', // First player starts their turn cleanly!
    });
  };

  const executeWinAndPayout = async (winnerId: string, updatedHands: any, updatedMelds: any, updatedCounts: any) => {
    const potAmount = room?.pot ?? 0;
    const betAmount = room?.bet_amount ?? 0;
    const { net } = calculatePayout(potAmount);

    for (const p of activePlayers) {
      if (p.is_spectator) continue;
      // All active players already inherently paid their betAmount immediately upon startGame!
      if (p.player_id === winnerId) {
        const newBalance = Math.max(0, p.balance + net);
        await updatePlayer(p.player_id, { balance: newBalance });
      }
    }

    await updateGameState({ hands: updatedHands, melds: updatedMelds, meld_counts: updatedCounts, turn_phase: 'between_turns' });
    await updateRoom({ status: 'finished' });
    setShowWinner(winnerId);
  };

  // ── Meld (called from CardHand with the full set including drawnCard) ─────
  const handleMeld = async (cardsToMeld: CardType[]) => {
    if (!gameState || !profile || !isMyTurn) return;
    lastLocalMeldRef.current = Date.now();

    const handCardIds = new Set(cardsToMeld.map((c) => c.id));
    const remainingHand = myHand.filter((c) => !handCardIds.has(c.id));
    
    let updatedMelds = { ...gameState.melds };
    const myMelds = updatedMelds[profile.playerId] ? [...updatedMelds[profile.playerId]] : [];

    // Filter donor table cards out
    const updatedMyMelds: CardType[][] = [];
    myMelds.forEach(meld => {
       const taking = meld.filter(c => handCardIds.has(c.id));
       if (taking.length > 0) {
           const remnants = extractCardsFromMeld(meld, taking.map(c => c.id));
           if (remnants) {
               updatedMyMelds.push(...remnants);
           }
       } else {
           updatedMyMelds.push(meld);
       }
    });

    updatedMelds[profile.playerId] = updatedMyMelds;

    let isMultiExtension = false;
    let targetPlayerId = '';
    let targetMeldIndex = -1;

    // Use updatedMelds for the extension search since table arrays may have just been violently split!
    if (!isValidMeld(cardsToMeld)) {
        const multiExtend = findMultiCardExtensions(updatedMelds, cardsToMeld);
        if (multiExtend) {
            isMultiExtension = true;
            targetPlayerId = multiExtend.playerId;
            targetMeldIndex = multiExtend.meldIndex;
        } else {
            return;
        }
    }

    let newMeldCount = 0;
    
    if (isMultiExtension) {
        const targetMelds = updatedMelds[targetPlayerId] ?? [];
        const newMeld = sortMeld([...targetMelds[targetMeldIndex], ...cardsToMeld]);
        const newMelds = [...targetMelds];
        newMelds[targetMeldIndex] = newMeld;
        
        // Re-calculate the specific player's total meld points
        newMeldCount = countMeldedCards(newMelds);
        updatedMelds[targetPlayerId] = newMelds;
    } else {
        targetPlayerId = profile.playerId;
        const existingMelds = updatedMelds[profile.playerId] ?? [];
        const newMelds = [...existingMelds, sortMeld(cardsToMeld)];
        
        // Re-calculate the local player's total meld points
        newMeldCount = countMeldedCards(newMelds);
        updatedMelds[profile.playerId] = newMelds;
    }

    const updatedCounts = { ...gameState.meld_counts, [targetPlayerId]: newMeldCount };
    // Force a recount on the local player explicitly just in case they split a run and lost/gained array lengths!
    if (targetPlayerId !== profile.playerId) {
        updatedCounts[profile.playerId] = countMeldedCards(updatedMelds[profile.playerId]);
    }
    const updatedHands = { ...gameState.hands, [profile.playerId]: remainingHand };

    setDrawnCard(null); setDrawnCardSource(null); setSelectedCards(new Set());
    setSelectedTableCards(new Set());

    const winner = checkWinner(updatedMelds, updatedHands);
    if (winner || newMeldCount >= 10) {
      await executeWinAndPayout(winner ?? targetPlayerId, updatedHands, updatedMelds, updatedCounts);
      return;
    }

    // If melding before drawing (offer_discard phase), stay in offer_discard
    // so the player still needs to claim/draw. Otherwise move to meld_or_discard.
    const nextPhase = !drawnCard && turnPhase === 'offer_discard' ? 'offer_discard' : 'meld_or_discard';
    await updateGameState({ hands: updatedHands, melds: updatedMelds, meld_counts: updatedCounts, turn_phase: nextPhase });
  };

  // ── Extend an existing meld with a hand card ──────────────────────────────
  const handleExtendMeld = async (targetPlayerId: string, meldIndex: number, specificCardId?: string) => {
    if (!gameState || !profile || !isMyTurn) return;
    lastLocalMeldRef.current = Date.now();
    
    let card: CardType | undefined;
    if (specificCardId) {
      card = myHand.find((c) => c.id === specificCardId);
    } else {
      const selected = myHand.filter((c) => selectedCards.has(c.id));
      if (selected.length === 1) card = selected[0];
    }
    
    if (!card) return;
    
    const targetMelds = gameState.melds[targetPlayerId] ?? [];
    const meld = targetMelds[meldIndex];
    if (!meld || !canExtendMeld(meld, card)) return;

    const newMeld = sortMeld([...meld, card]);
    const newMelds = [...targetMelds]; newMelds[meldIndex] = newMeld;
    const remainingHand = myHand.filter((c) => c.id !== card!.id);
    const newCount = countMeldedCards(newMelds);

    const updatedMelds = { ...gameState.melds, [targetPlayerId]: newMelds };
    const updatedCounts = { ...gameState.meld_counts, [targetPlayerId]: newCount };
    const updatedHands = { ...gameState.hands, [profile.playerId]: remainingHand };

    const winner = checkWinner(updatedMelds, updatedHands);
    if (winner || newCount >= 10) {
      await executeWinAndPayout(winner ?? targetPlayerId, updatedHands, updatedMelds, updatedCounts);
      return;
    }

    await updateGameState({
      hands: updatedHands,
      melds: updatedMelds,
      meld_counts: updatedCounts,
    });
    
    if (!specificCardId) setSelectedCards(new Set());
  };

  // ── Discard a hand card to end the turn ──────────────────────────────────
  const handleDiscard = async (card: CardType) => {
    if (!gameState || !profile || !isMyTurn || drawnCard) return;
    await doDiscard(card);
  };

  const doDiscard = async (card: CardType) => {
    if (!gameState || !profile) return;
    const remainingHand = myHand.filter((c) => c.id !== card.id);
    const basePidList = activePlayers.filter((p) => !p.is_spectator).map((p) => p.player_id);
    const foldedPids = basePidList.filter((id) => (gameState.hands[id]?.length ?? 0) === 10);
    const nextPid = nextPlayerClockwise(basePidList, profile.playerId, foldedPids);

    // Core update — always works (these columns have always existed)
    const err = await updateGameState({
      hands: { ...gameState.hands, [profile.playerId]: remainingHand },
      discard_pile: [...gameState.discard_pile, card],
      current_player_id: nextPid,
      turn_phase: nextPid === profile.playerId ? 'draw_or_take' : 'offer_discard',
    });
    if (err) { console.error('[doDiscard] core update failed:', err); return; }

    // Offer-system columns — requires SQL migration; fails gracefully if absent
    await updateGameState({
      offer_deadline: Date.now() + OFFER_WINDOW_MS,
      discard_claims: {},
      last_discard_by: profile.playerId,
    }).catch(() => {/* migration not yet applied */});

    setSelectedCards(new Set());
  };

  // ── Fold the current hand (Allowed only on first turn BEFORE melding) ─────
  const handleFold = async () => {
    if (!gameState || !profile || !isMyTurn || !drawnCard || drawnCardSource !== 'stock') return;
    
    // Inject the drawn card directly into the player's permanent hand array leaving them with strictly 10 cards.
    // The engine's generic math natively extracts anyone holding 10 unmelded cards directly out of the clockwise loop.
    const updatedHand = [...myHand, drawnCard];
    const updatedHands = { ...gameState.hands, [profile.playerId]: updatedHand };
    
    const basePidList = activePlayers.filter((p) => !p.is_spectator).map((p) => p.player_id);
    const foldedPids = basePidList.filter((id) => id === profile.playerId || (updatedHands[id]?.length ?? 0) === 10);
    const nextPid = nextPlayerClockwise(basePidList, profile.playerId, foldedPids);
    
    // If the recursive logic looped entirely around and landed back on us, everyone else folded.
    // The game must immediately trigger exhaustive stalemate parameters.
    if (nextPid === profile.playerId) {
      await updateRoom({ status: 'lobby' });
      setShowDraw(true); 
      return;
    }
    
    // Bypass offer_discard strictly into draw_or_take since no discard was actually submitted.
    await updateGameState({
      hands: updatedHands,
      current_player_id: nextPid,
      turn_phase: 'draw_or_take',
      offer_deadline: null,
      discard_claims: {}
    });
    
    setDrawnCard(null); setDrawnCardSource(null); setSelectedCards(new Set());
  };

  // ── Force rule ────────────────────────────────────────────────────────────
  const handleForce = async () => {
    if (!gameState || !profile) return;
    lastLocalMeldRef.current = Date.now();
    
    // Attempt to force drawn card first
    if (drawnCard && isMyTurn) {
        const targets = findAllForceTargets(gameState.melds, drawnCard);
        if (targets.length > 0) {
            const target = targets[0];
            const targetMelds = gameState.melds[target.playerId] ?? [];
            const newMeld = sortMeld([...targetMelds[target.meldIndex], drawnCard]);
            const newMelds = [...targetMelds];
            newMelds[target.meldIndex] = newMeld;
            const newCount = countMeldedCards(newMelds);
            
            const updatedMelds = { ...gameState.melds, [target.playerId]: newMelds };
            const updatedCounts = { ...gameState.meld_counts, [target.playerId]: newCount };
            
            const winner = checkWinner(updatedMelds, gameState.hands);
            if (winner || newCount >= 10) {
                await executeWinAndPayout(winner ?? target.playerId, gameState.hands, updatedMelds, updatedCounts);
                return;
            }

            // Current player's turn abruptly ends; target is forced to take the card into their meld
            // meaning the target must now discard!
            const err = await updateGameState({
                melds: updatedMelds,
                meld_counts: updatedCounts,
                current_player_id: target.playerId,
                turn_phase: 'meld_or_discard',
            });
            if (err) { console.error('[handleForce] drawn failed:', err); return; }
            await updateGameState({ offer_deadline: null, discard_claims: {} }).catch(() => {});
            setDrawnCard(null); setDrawnCardSource(null); setSelectedCards(new Set());
            return;
        }
    }

    // Otherwise force discard pile
    const topCard = gameState.discard_pile.at(-1);
    if (!topCard) return;
    const targets = findAllForceTargets(gameState.melds, topCard);
    if (targets.length === 0) return;

    {
        const target = targets[0];
        const targetMelds = gameState.melds[target.playerId] ?? [];
        const newMeld = sortMeld([...targetMelds[target.meldIndex], topCard]);
        const newMelds = [...targetMelds];
        newMelds[target.meldIndex] = newMeld;
        const newCount = countMeldedCards(newMelds);

        const updatedMelds = { ...gameState.melds, [target.playerId]: newMelds };
        const updatedCounts = { ...gameState.meld_counts, [target.playerId]: newCount };

        const winner = checkWinner(updatedMelds, gameState.hands);
        if (winner || newCount >= 10) {
            await executeWinAndPayout(winner ?? target.playerId, gameState.hands, updatedMelds, updatedCounts);
            return;
        }

        // Core update
        const err = await updateGameState({
            melds: updatedMelds,
            meld_counts: updatedCounts,
            discard_pile: gameState.discard_pile.slice(0, -1),
            current_player_id: target.playerId,
            turn_phase: 'meld_or_discard',
        });
        if (err) { console.error('[handleForce] discard failed:', err); return; }

        // Offer reset — fails gracefully
        await updateGameState({ offer_deadline: null, discard_claims: {} }).catch(() => {});
    }
  };

  // ── Meld extendability ────────────────────────────────────────────────────
  const extendableMelds = new Set<number>();
  if (isMyTurn && selectedCards.size === 1 && !drawnCard) {
    const cardId = [...selectedCards][0];
    const card = myHand.find((c) => c.id === cardId);
    if (card) findExtendableMelds(myMelds, card).forEach((i) => extendableMelds.add(i));
  }

  const topCard = gameState?.discard_pile?.at(-1);
  const discardForceTargets = topCard && gameState ? findAllForceTargets(gameState.melds ?? {}, topCard) : [];
  const canForceDiscard = Boolean(
    !isSpectator && !isFolded && topCard && gameState &&
    discardForceTargets.length > 0 &&
    turnPhase === 'offer_discard'
  );
  const isSelfForceDiscard = canForceDiscard && discardForceTargets[0]?.playerId === profile?.playerId;

  const drawnForceTargets = drawnCard && gameState ? findAllForceTargets(gameState.melds ?? {}, drawnCard) : [];
  const canForceDrawn = Boolean(isMyTurn && drawnForceTargets.length > 0);
  const isSelfForceDrawn = canForceDrawn && drawnForceTargets[0]?.playerId === profile?.playerId;

  // Anyone (except spectators, folded players, and the discarder) can claim during offer phase
  const canClaim = turnPhase === 'offer_discard' && !isSpectator && !isFolded && joined
    && profile?.playerId !== gameState?.last_discard_by;
  const canDraw = isMyTurn && (turnPhase === 'draw_or_take' || turnPhase === 'offer_discard') && !drawnCard;

  // ── Lobby handlers ────────────────────────────────────────────────────────
  const handleVote = async (vote: 'yes' | 'no') => {
    if (!profile) return;
    await updatePlayer(profile.playerId, { vote, is_ready: vote === 'yes' });
  };

  const handleProposeBet = async (amount: number) => {
    await updateRoom({ bet_amount: amount });
    for (const p of activePlayers) await updatePlayer(p.player_id, { vote: null, is_ready: false });
  };

  const nonHostPlayers = activePlayers.filter((p) => p.player_id !== room?.host_id);
  const canStart = activePlayers.length >= 2 && nonHostPlayers.length > 0
    && nonHostPlayers.every((p) => p.vote === 'yes') && (room?.bet_amount ?? 0) > 0;

  const handlePlayAgain = async () => {
    setShowWinner(null); setDrawnCard(null); setDrawnCardSource(null);
    for (const p of activePlayers) await updatePlayer(p.player_id, { is_ready: false, vote: null });
    await updateRoom({ status: 'lobby', pot: 0 });
  };

  const handleNewBet = async () => {
    setShowWinner(null); setDrawnCard(null); setDrawnCardSource(null);
    await updateRoom({ status: 'lobby', bet_amount: 0, pot: 0 });
    for (const p of activePlayers) await updatePlayer(p.player_id, { is_ready: false, vote: null });
  };

  const toggleCard = (cardId: string) => {
    setSelectedCards((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId); else next.add(cardId);
      return next;
    });
  };

  // ── Render guards ─────────────────────────────────────────────────────────
  if (!loaded) return null;
  if (!profile && loaded) return <CharacterCreation open={true} onComplete={(data) => { saveProfile(data); }} />;
  if (notFound) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <p className="text-xl text-red-400">{t('roomNotFound', lang)}</p>
      <Button variant="ghost" onClick={() => router.push('/')}>{lang === 'en' ? 'Back Home' : 'Inicio'}</Button>
    </div>
  );

  const derivedWinnerId = players.find((p) => (gameState?.meld_counts?.[p.player_id] || 0) >= 10)?.player_id || null;
  const actualWinnerId = showWinner || derivedWinnerId;
  const winnerPlayer = actualWinnerId ? players.find((p) => p.player_id === actualWinnerId) : null;

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex flex-col overflow-hidden">
      <TopBar roomCode={code} balance={localPlayer?.balance} bet={room?.bet_amount} 
        pot={room?.status === 'playing' || room?.status === 'finished' ? room?.pot : (room?.bet_amount ?? 0) * activePlayers.length}
        isMicMuted={isMuted} toggleMic={() => setIsMuted((m) => !m)}
        isSpeakerMuted={isDeafened} toggleSpeaker={() => setIsDeafened((d) => !d)}
        isSpectator={isSpectator} />

      <div className={`flex-1 flex flex-col mt-[57px] ${chatOpen ? 'mr-72' : ''} transition-[margin] duration-300`}>
        {/* Turn / offer indicator */}
        {room?.status === 'playing' && (
          <div className="text-center py-1.5">
            {turnPhase === 'offer_discard' && offerCountdown > 0 ? (
              <div className="flex items-center justify-center gap-2">
                <span className="chip chip-gold animate-pulse">
                  ⏱ {lang === 'en' ? 'Discard offered' : 'Descarte ofrecido'} — {offerCountdown}s
                </span>
                {hasClaimed && !isMyTurn && (
                  <span className="chip chip-green text-xs">✓ {lang === 'en' ? 'Claimed!' : '¡Reclamado!'}</span>
                )}
              </div>
            ) : isMyTurn ? (
              <span className="chip chip-gold animate-pulse">{t('yourTurn', lang)}</span>
            ) : (
              <span className="text-xs text-gray-500">
                {players.find((p) => p.player_id === currentPlayerId)?.display_name}&apos;s turn
              </span>
            )}
          </div>
        )}

        <div className="flex-1 flex flex-col items-center justify-center px-4 gap-4 py-6">
          {/* LOBBY */}
          {room?.status === 'lobby' && (
            <div className="flex flex-col lg:flex-row gap-6 items-center w-full max-w-4xl">
              <div className="flex-1 flex items-center justify-center min-h-[400px]">
                <PokerTable activePlayers={activePlayers} spectators={spectators}
                  localPlayerId={profile?.playerId ?? ''} gameState={gameState} melds={{}}
                  timeLeft={30} isSpectator={isSpectator}
                  onClaimDiscard={() => {}} onDraw={() => {}} onForce={() => {}}
                  canClaim={false} canDraw={false} canForce={false}
                  onExtendMeld={() => {}} extendableMelds={new Set()}
                  offerCountdown={0} discardClaims={{}} localPlayerId2={profile?.playerId ?? ''}
                  selectedTableCardIds={new Set()} onSelectTableCard={() => {}}
                  speakingPlayerIds={speakingIds}
                />
              </div>

              {!isSpectator && localPlayer && room && (
                <div className="flex flex-col gap-2">
                  <LobbyControls players={activePlayers} localPlayer={localPlayer} room={room}
                    isHost={isHost} onVote={handleVote} onProposeBet={handleProposeBet}
                    onStartGame={startGame} canStart={canStart}
                    localPlayerId={profile?.playerId ?? ''} startLoading={startLoading}
                    onFundAccount={async () => {
                      if (!profile) return;
                      await updatePlayer(profile.playerId, { balance: (localPlayer.balance ?? 0) + 10 });
                    }}
                  />
                  {startError && (
                    <div className="bg-red-950 border border-red-700 rounded-xl px-4 py-3 text-sm text-red-300">
                      {startError}
                    </div>
                  )}
                </div>
              )}

              {isSpectator && (
                <div className="flex flex-col items-center gap-3 p-6 bg-[#1a1a1a] border border-[#333] rounded-xl">
                  <span className="text-2xl">👁️</span>
                  <p className="text-sm text-gray-400">{t('youAreSpectator', lang)}</p>
                  <Button id="join-next-round-btn" variant="ghost" onClick={async () => {
                    if (!profile) return;
                    const seats = activePlayers.map((p) => p.seat_number).filter(Boolean) as number[];
                    const nextSeat = [1, 2, 3, 4].find((s) => !seats.includes(s));
                    if (nextSeat) await updatePlayer(profile.playerId, { is_spectator: false, seat_number: nextSeat });
                  }}>
                    {t('joinNextRound', lang)}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* PLAYING */}
          {room?.status === 'playing' && gameState && (
            <div className="flex flex-col items-center gap-4 w-full max-w-4xl">
              <PokerTable activePlayers={activePlayers} spectators={spectators}
                localPlayerId={profile?.playerId ?? ''} gameState={gameState}
                melds={gameState.melds ?? {}} timeLeft={30} isSpectator={isSpectator}
                onClaimDiscard={handleClaimDiscard} onDraw={handleDraw} onForce={handleForce}
                canClaim={canClaim} canDraw={canDraw} canForce={canForceDiscard}
                onExtendMeld={handleExtendMeld} extendableMelds={extendableMelds}
                selectedTableCardIds={selectedTableCards} onSelectTableCard={toggleTableCard}
                offerCountdown={offerCountdown}
                discardClaims={gameState.discard_claims ?? {}}
                localPlayerId2={profile?.playerId ?? ''}
                forcedCardId={forcedCardId}
                speakingPlayerIds={speakingIds}
              />

              {!isSpectator && (
                <div className="w-full max-w-2xl text-center">
                  {turnPhase === 'meld_or_discard' && forcedCardId && isMyTurn && (
                    <div className="mb-4 inline-block px-6 py-2 bg-green-950/80 border-2 border-green-500 rounded-full text-green-300 font-bold shadow-[0_0_20px_rgba(34,197,94,0.4)] animate-bounce">
                       {lang === 'en' ? '⚠️ Someone forced a card onto your melds! You must discard!' : '⚠️ ¡Alguien forzó una carta en tus juegos! ¡Debes descartar!'}
                    </div>
                  )}
                  <CardHand cards={myHand} selectedIds={selectedCards} onSelect={toggleCard}
                    onMeld={handleMeld} onDiscard={handleDiscard}
                    canMeld={isMyTurn} canDiscard={isMyTurn && turnPhase === 'meld_or_discard' && !drawnCard}
                    isYourTurn={isMyTurn} turnPhase={turnPhase}
                    drawnCard={drawnCard} drawnCardSource={drawnCardSource}
                    onDiscardDrawnCard={handleDiscardDrawnCard}
                    canForceDrawn={canForceDrawn}
                    onForceDrawn={handleForce}
                    isSelfForceDrawn={isSelfForceDrawn}
                    onReturnDiscard={handleReturnDiscard}
                    onCambiar={handleCambiar}
                    hasCambiaLocked={!!(gameState.discard_claims && gameState.discard_claims[profile?.playerId ?? ''])}
                    lockedCambiaCardId={gameState.discard_claims?.[profile?.playerId ?? '']?.id}
                    onFold={handleFold}
                    foldAllowed={isMyTurn && drawnCardSource === 'stock' && (gameState?.discard_pile?.length ?? 0) < activePlayers.filter(p => !p.is_spectator).length && myMelds.length === 0}
                    melds={gameState.melds ?? {}}
                    tableCardIds={selectedTableCards}
                    localPlayerId={profile?.playerId ?? ''}
                  />
                </div>
              )}

              {isSpectator && <div className="text-center"><span className="chip chip-gold">{t('spectating', lang)}</span></div>}
            </div>
          )}

          {/* FINISHED */}
          {room?.status === 'finished' && !winnerPlayer && (
            <div className="text-center space-y-3">
              <p className="text-gray-400">{lang === 'en' ? 'Game over' : 'Juego terminado'}</p>
              <Button variant="primary" onClick={handlePlayAgain}>{t('playAgain', lang)}</Button>
            </div>
          )}
        </div>
      </div>

      <ChatPanel messages={messages}
        onSendMessage={(content) => {
          if (!profile) return;
          sendMessage(content, { playerId: profile.playerId, displayName: profile.displayName, avatar: profile.avatar });
        }}
        pot={room?.pot ?? 0} betAmount={room?.bet_amount ?? 0}
        spectators={spectators} isCollapsed={!chatOpen}
        onToggle={() => setChatOpen((o) => !o)}
        localPlayerId={profile?.playerId}
      />

      {winnerPlayer && room?.status === 'finished' && room && (
        <WinnerSplash winner={winnerPlayer} allPlayers={activePlayers} pot={room.pot}
          isLocalWinner={winnerPlayer.player_id === profile?.playerId}
          onPlayAgain={handlePlayAgain} onNewBet={handleNewBet}
          onLeaveSeat={async () => {
             if (profile) await updatePlayer(profile.playerId, { is_spectator: true, seat_number: null, is_ready: false, vote: null });
             setShowWinner(null);
          }}
        />
      )}

      {/* ── Background VoIP Engine ── */}
      {liveKitToken && (
        <LiveKitRoom
          serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
          token={liveKitToken}
          className="hidden"
        >
          <VoiceController isMuted={isMuted} onSpeakingUpdate={setSpeakingIds} />
          {!isDeafened && <RoomAudioRenderer />}
        </LiveKitRoom>
      )}

      {showDraw && (
        <DrawSplash newPot={(room?.pot ?? 0) + ((room?.bet_amount ?? 0) * activePlayers.filter(p => !p.is_spectator).length)}
          onContinue={async () => { setShowDraw(false); await handlePlayAgain(); }} />
      )}
    </div>
  );
}
