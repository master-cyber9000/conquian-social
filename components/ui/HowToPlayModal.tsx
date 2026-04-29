'use client';

import { useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import Modal from './Modal';

const TABS = ['basics', 'turns', 'melding', 'special', 'betting'] as const;
type Tab = typeof TABS[number];

const TAB_LABELS: Record<Tab, { en: string; es: string }> = {
  basics:  { en: 'Basics',   es: 'Básico' },
  turns:   { en: 'Turns',    es: 'Turnos' },
  melding: { en: 'Melding',  es: 'Bajadas' },
  special: { en: 'Special',  es: 'Especial' },
  betting: { en: 'Betting',  es: 'Apuestas' },
};

const TAB_ICONS: Record<Tab, string> = {
  basics:  '🃏',
  turns:   '🔄',
  melding: '🎴',
  special: '⚡',
  betting: '💰',
};

interface RuleItem {
  icon: string;
  en: string;
  es: string;
}

const RULES: Record<Tab, { title: { en: string; es: string }; items: RuleItem[] }> = {
  basics: {
    title: { en: 'Game Basics', es: 'Reglas Básicas' },
    items: [
      { icon: '👥', en: '2–4 active players per game. Others can spectate and queue for the next round.', es: '2–4 jugadores activos por partida. Los demás pueden ver y hacer cola para la siguiente ronda.' },
      { icon: '🎴', en: 'Standard 52-card deck. Each player is dealt 9 cards.', es: 'Baraja estándar de 52 cartas. Se reparten 9 cartas a cada jugador.' },
      { icon: '🏆', en: 'First player to meld (lay down) 10 cards wins the pot!', es: '¡El primer jugador en bajar 10 cartas gana el pozo!' },
      { icon: '♠️', en: 'Melds are sets (3–4 of the same rank) or runs (3+ consecutive cards of the same suit).', es: 'Las bajadas son series (3–4 del mismo valor) o escaleras (3+ cartas consecutivas del mismo palo).' },
      { icon: '🔤', en: 'Ace is always low (A-2-3 is valid, Q-K-A is not).', es: 'El as siempre es bajo (A-2-3 es válido, Q-K-A no lo es).' },
    ],
  },
  turns: {
    title: { en: 'Turn Flow', es: 'Flujo del Turno' },
    items: [
      { icon: '1️⃣', en: 'La Cambia — At the start, each player selects 1 card to pass to the player on their right. All exchanges happen simultaneously.', es: 'La Cambia — Al inicio, cada jugador selecciona 1 carta para pasar al jugador de su derecha. Todos los intercambios ocurren simultáneamente.' },
      { icon: '2️⃣', en: 'After La Cambia, normal turns begin. When someone discards, the card is offered to ALL players.', es: 'Después de La Cambia, comienzan los turnos normales. Cuando alguien descarta, la carta se ofrece a TODOS los jugadores.' },
      { icon: '3️⃣', en: 'Any player can claim the discard (first come, first served). If claimed, you MUST immediately meld it.', es: 'Cualquier jugador puede reclamar el descarte (el primero en llegar gana). Si la tomas, DEBES bajarla inmediatamente.' },
      { icon: '4️⃣', en: 'If nobody claims the discard, the active player draws from the stock pile.', es: 'Si nadie reclama el descarte, el jugador activo roba del mazo.' },
      { icon: '5️⃣', en: 'After drawing, you can meld cards or discard one card to end your turn.', es: 'Después de robar, puedes bajar cartas o descartar una carta para terminar tu turno.' },
    ],
  },
  melding: {
    title: { en: 'Melding Rules', es: 'Reglas de Bajada' },
    items: [
      { icon: '📦', en: 'Sets — 3 or 4 cards of the same rank (e.g., 7♠ 7♥ 7♦).', es: 'Series — 3 o 4 cartas del mismo valor (ej. 7♠ 7♥ 7♦).' },
      { icon: '📈', en: 'Runs — 3+ consecutive cards of the same suit (e.g., 4♣ 5♣ 6♣ 7♣).', es: 'Escaleras — 3+ cartas consecutivas del mismo palo (ej. 4♣ 5♣ 6♣ 7♣).' },
      { icon: '➕', en: 'You can extend existing melds by adding cards that keep the meld valid.', es: 'Puedes extender bajadas existentes añadiendo cartas que mantengan la bajada válida.' },
      { icon: '🔀', en: 'You can rearrange cards from your own melds to form new combinations, as long as all resulting groups stay valid (3+ cards each).', es: 'Puedes reorganizar cartas de tus propias bajadas para formar nuevas combinaciones, siempre que todos los grupos resultantes sigan siendo válidos (3+ cartas cada uno).' },
      { icon: '🎯', en: 'Select hand cards + table cards together, then press Meld to lay them down.', es: 'Selecciona cartas de la mano + cartas de la mesa juntas, luego presiona Bajar para colocarlas.' },
    ],
  },
  special: {
    title: { en: 'Special Rules', es: 'Reglas Especiales' },
    items: [
      { icon: '⚡', en: 'Force Rule — If the discard or drawn card can extend an opponent\'s meld, you can force it onto them! They must then discard.', es: 'Regla de Forzar — ¡Si el descarte o carta robada puede extender la bajada de un oponente, puedes forzarla sobre ellos! Deben descartar después.' },
      { icon: '🏳️', en: 'Fold (Doble) — On your very first turn, before melding, you can fold. Your hand locks at 10 cards and you\'re out of the round.', es: 'Doblarse — En tu primer turno, antes de bajar, puedes doblarte. Tu mano se queda con 10 cartas y sales de la ronda.' },
      { icon: '🔄', en: 'Draw Condition — If the stock pile runs out, the round is a draw. The pot carries over and doubles for the next round!', es: 'Condición de Empate — Si el mazo se agota, la ronda es empate. ¡El pozo se acumula y se duplica para la siguiente ronda!' },
      { icon: '↩️', en: 'Return Discard — If you claimed a discard but can\'t meld it, you can return it to the table.', es: 'Devolver Descarte — Si reclamaste un descarte pero no puedes bajarlo, puedes devolverlo a la mesa.' },
      { icon: '👁️', en: 'Spectators — Late joiners or players who step down watch the game and can queue to join the next round.', es: 'Espectadores — Los que llegan tarde o se retiran ven el juego y pueden hacer cola para unirse a la siguiente ronda.' },
    ],
  },
  betting: {
    title: { en: 'Betting & Payouts', es: 'Apuestas y Pagos' },
    items: [
      { icon: '💵', en: 'The host proposes a bet amount. All active players vote — unanimous agreement is required.', es: 'El anfitrión propone un monto de apuesta. Todos los jugadores activos votan — se requiere acuerdo unánime.' },
      { icon: '🏦', en: 'Each player\'s bet is deducted from their balance when the game starts, forming the pot.', es: 'La apuesta de cada jugador se deduce de su saldo al iniciar el juego, formando el pozo.' },
      { icon: '🏆', en: 'The winner takes the entire pot minus a 5% platform fee.', es: 'El ganador se lleva todo el pozo menos una comisión del 5%.' },
      { icon: '💰', en: 'Starting balance is $10.00. You can add funds at any time from the lobby.', es: 'El saldo inicial es $10.00. Puedes añadir fondos en cualquier momento desde el lobby.' },
      { icon: '🔄', en: 'On a draw, the pot carries over and the next round\'s bets are added on top — making the stakes even higher!', es: 'En empate, el pozo se acumula y las apuestas de la siguiente ronda se suman — ¡aumentando las apuestas!' },
    ],
  },
};

interface HowToPlayModalProps {
  open: boolean;
  onClose: () => void;
}

export default function HowToPlayModal({ open, onClose }: HowToPlayModalProps) {
  const { lang } = useLanguage();
  const [activeTab, setActiveTab] = useState<Tab>('basics');

  const content = RULES[activeTab];

  return (
    <Modal open={open} onClose={onClose} title={lang === 'en' ? '📖 How to Play' : '📖 Cómo Jugar'} maxWidth="max-w-lg">
      <div className="flex flex-col gap-4">
        {/* Tab bar */}
        <div className="flex gap-1 overflow-x-auto pb-1 custom-scrollbar">
          {TABS.map((tab) => (
            <button
              key={tab}
              id={`htp-tab-${tab}`}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                activeTab === tab
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.15)]'
                  : 'bg-[#222] text-gray-400 border border-transparent hover:bg-[#2a2a2a] hover:text-gray-300'
              }`}
            >
              <span>{TAB_ICONS[tab]}</span>
              <span>{TAB_LABELS[tab][lang]}</span>
            </button>
          ))}
        </div>

        {/* Section title */}
        <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
          <span>{TAB_ICONS[activeTab]}</span>
          {content.title[lang]}
        </h3>

        {/* Rules list */}
        <div className="flex flex-col gap-3 max-h-[50vh] overflow-y-auto pr-1 custom-scrollbar">
          {content.items.map((item, i) => (
            <div
              key={i}
              className="flex gap-3 items-start p-3 rounded-xl bg-[#191919] border border-[#2a2a2a] hover:border-[#3a3a3a] transition-colors duration-200"
            >
              <span className="text-lg flex-shrink-0 mt-0.5">{item.icon}</span>
              <p className="text-sm text-gray-300 leading-relaxed">{item[lang]}</p>
            </div>
          ))}
        </div>

        {/* Quick tip */}
        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-950/30 border border-amber-800/30">
          <span className="text-lg">💡</span>
          <p className="text-xs text-amber-300/80 leading-relaxed">
            {lang === 'en'
              ? 'Tip: Drag cards in your hand to reorder them. Select cards and tap Meld to lay them down!'
              : 'Tip: Arrastra las cartas en tu mano para reordenarlas. ¡Selecciona cartas y presiona Bajar para colocarlas!'}
          </p>
        </div>
      </div>
    </Modal>
  );
}
