import { CardType } from './supabase';

// ============================================================
// Deck Building
// ============================================================

const SUITS: CardType['suit'][] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: CardType['rank'][] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const RANK_VALUES: Record<CardType['rank'], number> = {
  A: 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
  '8': 8, '9': 9, '10': 10, J: 11, Q: 12, K: 13,
};

export function buildDeck(): CardType[] {
  const deck: CardType[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank, id: `${rank}-${suit}` });
    }
  }
  return deck;
}

export function shuffleDeck(deck: CardType[]): CardType[] {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

export function dealHands(deck: CardType[], playerIds: string[], cardsPerPlayer = 9): {
  hands: Record<string, CardType[]>;
  stock: CardType[];
} {
  const shuffled = shuffleDeck(deck);
  const hands: Record<string, CardType[]> = {};
  let idx = 0;
  for (const pid of playerIds) {
    hands[pid] = shuffled.slice(idx, idx + cardsPerPlayer);
    idx += cardsPerPlayer;
  }
  return { hands, stock: shuffled.slice(idx) };
}

// ============================================================
// Meld Validation
// ============================================================

export function isValidMeld(cards: CardType[]): boolean {
  if (cards.length < 3) return false;
  return isSet(cards) || isRun(cards);
}

export function sortMeld(cards: CardType[]): CardType[] {
  if (isRun(cards)) {
    return [...cards].sort((a, b) => RANK_VALUES[a.rank] - RANK_VALUES[b.rank]);
  }
  return cards; // Sets order doesn't matter
}

function isSet(cards: CardType[]): boolean {
  if (cards.length < 3 || cards.length > 4) return false;
  const rank = cards[0].rank;
  return cards.every((c) => c.rank === rank);
}

function isRun(cards: CardType[]): boolean {
  if (cards.length < 3) return false;
  const suit = cards[0].suit;
  if (!cards.every((c) => c.suit === suit)) return false;
  const vals = cards.map((c) => RANK_VALUES[c.rank]).sort((a, b) => a - b);
  // Check consecutive
  for (let i = 1; i < vals.length; i++) {
    if (vals[i] !== vals[i - 1] + 1) return false;
  }
  // Ace is low only — reject Q K A (12,13,1 sorted would be 1,12,13 but vals[1]-vals[0] > 1)
  // After sort: ace=1, so runs starting with A are fine (1,2,3). Q,K,A would sort to 1,12,13 → gap detected ✓
  return true;
}

// Can a single card extend an existing meld?
export function canExtendMeld(meld: CardType[], card: CardType): boolean {
  // Try adding the card to the meld
  const extended = [...meld, card];
  return isValidMeld(extended);
}

// Can multiple cards extend an existing meld?
export function canExtendMeldMulti(meld: CardType[], cards: CardType[]): boolean {
  if (cards.length === 0) return false;
  const extended = [...meld, ...cards];
  return isValidMeld(extended);
}

// Extract cards from an existing meld and validate the remnants (supports splitting a run)
export function extractCardsFromMeld(meld: CardType[], extractIds: string[]): CardType[][] | null {
  const remaining = sortMeld(meld.filter((c) => !extractIds.includes(c.id)));
  if (remaining.length === 0) return null; // Generally shouldn't cannibalize the whole thing
  
  // If the remnant is mathematically intact
  if (isValidMeld(remaining)) return [remaining];

  // If it was a run, see if it cleanly split into two valid chunks
  if (isRun(meld)) {
     const chunks: CardType[][] = [];
     let currentChunk: CardType[] = [remaining[0]];
     for (let i = 1; i < remaining.length; i++) {
        if (RANK_VALUES[remaining[i].rank] === RANK_VALUES[currentChunk[currentChunk.length - 1].rank] + 1) {
            currentChunk.push(remaining[i]);
        } else {
            chunks.push(currentChunk);
            currentChunk = [remaining[i]];
        }
     }
     chunks.push(currentChunk);

     // Check if EVERY chunk is a valid 3+ sequence
     if (chunks.every(chunk => chunk.length >= 3 && isValidMeld(chunk))) {
         return chunks;
     }
  }

  return null;
}

export function findMultiCardExtensions(melds: Record<string, CardType[][]>, cards: CardType[], prioritizePlayerId?: string): { playerId: string, meldIndex: number } | null {
  if (prioritizePlayerId && melds[prioritizePlayerId]) {
    for (let i = 0; i < melds[prioritizePlayerId].length; i++) {
        if (canExtendMeldMulti(melds[prioritizePlayerId][i], cards)) {
            return { playerId: prioritizePlayerId, meldIndex: i };
        }
    }
  }

  for (const [playerId, playerMelds] of Object.entries(melds)) {
    if (playerId === prioritizePlayerId) continue;
    for (let i = 0; i < playerMelds.length; i++) {
        if (canExtendMeldMulti(playerMelds[i], cards)) {
            return { playerId, meldIndex: i };
        }
    }
  }
  return null;
}

// Which melds can a given card extend?
export function findExtendableMelds(melds: CardType[][], card: CardType): number[] {
  return melds
    .map((meld, i) => ({ meld, i }))
    .filter(({ meld }) => canExtendMeld(meld, card))
    .map(({ i }) => i);
}

// Find ALL force targets across every player's melds
export function findAllForceTargets(
  melds: Record<string, CardType[][]>,
  card: CardType
): { playerId: string; meldIndex: number }[] {
  const targets: { playerId: string; meldIndex: number }[] = [];
  for (const [playerId, playerMelds] of Object.entries(melds)) {
    playerMelds.forEach((meld, meldIndex) => {
      if (canExtendMeld(meld, card)) targets.push({ playerId, meldIndex });
    });
  }
  return targets;
}

// ============================================================
// Count melded cards for a player
// ============================================================

export function countMeldedCards(melds: CardType[][]): number {
  return melds.reduce((sum, meld) => sum + meld.length, 0);
}

// ============================================================
// Turn progression
// ============================================================

export function nextPlayerClockwise(playerIds: string[], currentId: string, foldedIds: string[] = []): string {
  let idx = playerIds.indexOf(currentId);
  if (idx === -1) idx = 0;
  
  for (let i = 1; i <= playerIds.length; i++) {
    const nextIdx = (idx + i) % playerIds.length;
    const candidate = playerIds[nextIdx];
    if (!foldedIds.includes(candidate)) {
      return candidate;
    }
  }
  return currentId; // If everyone else is folded
}

// ============================================================
// Win check
// ============================================================

export function checkWinner(
  melds: Record<string, CardType[][]>,
  hands: Record<string, CardType[]>
): string | null {
  for (const [playerId, playerMelds] of Object.entries(melds)) {
    const meldedCount = countMeldedCards(playerMelds);
    // Win: 10 total melded cards, or hand is empty (all melded)
    if (meldedCount >= 10) return playerId;
    // Also check: if remaining hand + melds = 10 melded (hand empty scenario)
    if (hands[playerId] && hands[playerId].length === 0 && meldedCount >= 10) return playerId;
  }
  return null;
}

// ============================================================
// Pot math
// ============================================================

export function calculatePayout(pot: number): { gross: number; fee: number; net: number } {
  const gross = pot;
  const fee = Math.round(pot * 0.05 * 100) / 100;
  const net = Math.round((pot - fee) * 100) / 100;
  return { gross, fee, net };
}

// ============================================================
// Room code generation
// ============================================================
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// ============================================================
// Discard offer — priority resolution
// ============================================================
/**
 * Given a set of claims {playerId: timestamp}, returns the playerId who wins
 * the discard based on clockwise priority starting from currentPlayerId.
 *
 * Priority: currentPlayerId → next clockwise → ... (lastDiscardBy is excluded
 * because you can't claim your own discard).
 *
 * Returns null if nobody claimed.
 */
export function resolveDiscardClaim(
  claims: Record<string, number>,
  playerIds: string[],
  currentPlayerId: string,
  lastDiscardBy: string | null
): string | null {
  if (Object.keys(claims).length === 0) return null;

  const startIdx = playerIds.indexOf(currentPlayerId);
  // Build clockwise order starting from currentPlayerId, skip the discarder
  const ordered = [
    ...playerIds.slice(startIdx),
    ...playerIds.slice(0, startIdx),
  ].filter((pid) => pid !== lastDiscardBy);

  return ordered.find((pid) => pid in claims) ?? null;
}

export const OFFER_WINDOW_MS = 10_000; // 10 seconds
