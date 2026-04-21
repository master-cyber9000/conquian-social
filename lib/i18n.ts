// ============================================================
// i18n.ts — All bilingual strings for Conquian Social
// ============================================================

export type Lang = 'en' | 'es';

export const translations = {
  // General
  appName: { en: 'Conquian Social', es: 'Conquian Social' },
  tagline: { en: 'Play with family. Bet with friends.', es: 'Juega con familia. Apuesta con amigos.' },
  gameDesc: {
    en: 'Conquian is a classic Mexican rummy-style card game for 2–4 players. Be the first to meld 10 cards to win the pot. Each discard is offered to all players before the next player draws — strategy and timing are everything.',
    es: 'Conquian es el clásico juego de cartas estilo rummy mexicano para 2–4 jugadores. Sé el primero en bajar 10 cartas para ganar el pozo. Cada descarte se ofrece a todos antes de robar — la estrategia y el momento lo son todo.',
  },

  // Navigation / Buttons
  createRoom: { en: 'Create Room', es: 'Crear Sala' },
  joinRoom: { en: 'Join Room', es: 'Unirse a Sala' },
  join: { en: 'Join', es: 'Unirse' },
  ready: { en: 'Ready', es: 'Listo' },
  notReady: { en: 'Not Ready', es: 'No Listo' },
  meld: { en: 'Meld', es: 'Bajar' },
  discard: { en: 'Discard', es: 'Descartar' },
  draw: { en: 'Draw', es: 'Robar' },
  force: { en: 'Force', es: 'Forzar' },
  takeSeat: { en: 'Take Seat', es: 'Tomar Asiento' },
  leaveSeat: { en: 'Leave Seat', es: 'Dejar Asiento' },
  inviteFriends: { en: 'Invite Friends', es: 'Invitar Amigos' },
  spectating: { en: 'Spectating', es: 'Espectador' },
  yourTurn: { en: 'Your Turn', es: 'Tu Turno' },
  meldToWin: { en: 'Meld {n} to Win', es: 'Baja {n} para Ganar' },
  pot: { en: 'Pot', es: 'Pozo' },
  balance: { en: 'Balance', es: 'Saldo' },
  playAgain: { en: 'Play Again', es: 'Jugar de Nuevo' },
  newBet: { en: 'New Bet', es: 'Nueva Apuesta' },
  drawPot: { en: 'Draw — Pot Carries Over and Doubles', es: 'Empate — El Pozo se Duplica' },
  reconnecting: { en: 'Reconnecting...', es: 'Reconectando...' },
  watching: { en: 'Watching', es: 'Mirando' },
  joinNextRound: { en: 'Join Next Round', es: 'Unirse al Siguiente Round' },
  platformFee: { en: 'Platform Fee (5%)', es: 'Comisión de la Plataforma (5%)' },
  claim: { en: 'Claim', es: 'Tomar' },
  pass: { en: 'Pass', es: 'Pasar' },
  extend: { en: 'Extend Meld', es: 'Extender Bajada' },
  confirm: { en: 'Confirm', es: 'Confirmar' },
  cancel: { en: 'Cancel', es: 'Cancelar' },
  copyCode: { en: 'Copy Code', es: 'Copiar Código' },
  copied: { en: 'Copied!', es: '¡Copiado!' },
  mute: { en: 'Mute', es: 'Silenciar' },
  unmute: { en: 'Unmute', es: 'Activar Micrófono' },
  send: { en: 'Send', es: 'Enviar' },
  leaveRoom: { en: 'Leave Room', es: 'Salir de la Sala' },

  // Character Creation
  characterTitle: { en: 'Create Your Profile', es: 'Crea Tu Perfil' },
  yourName: { en: 'Your Name', es: 'Tu Nombre' },
  namePlaceholder: { en: 'Enter your name...', es: 'Escribe tu nombre...' },
  chooseAvatar: { en: 'Choose Your Avatar', es: 'Elige Tu Avatar' },
  chooseBorderColor: { en: 'Choose Border Color', es: 'Elige Color de Borde' },
  letsPlay: { en: "Let's Play", es: 'A Jugar' },
  nameRequired: { en: 'Please enter your name', es: 'Por favor escribe tu nombre' },
  avatarRequired: { en: 'Please choose an avatar', es: 'Por favor elige un avatar' },

  // Room / Lobby
  roomCode: { en: 'Room', es: 'Sala' },
  enterRoomCode: { en: 'Enter room code...', es: 'Ingresa el código de sala...' },
  host: { en: 'Host', es: 'Anfitrión' },
  proposeBet: { en: 'Propose Bet', es: 'Proponer Apuesta' },
  betAmount: { en: 'Bet Amount', es: 'Monto de Apuesta' },
  votesFor: { en: 'Votes For', es: 'Votos a Favor' },
  votesAgainst: { en: 'Votes Against', es: 'Votos en Contra' },
  waitingForPlayers: { en: 'Waiting for players...', es: 'Esperando jugadores...' },
  waitingToStart: { en: 'Waiting to start...', es: 'Esperando para iniciar...' },
  allReadyToStart: { en: 'All players ready! Starting...', es: '¡Todos listos! Iniciando...' },
  minPlayers: { en: 'Need at least 2 players to start', es: 'Se necesitan al menos 2 jugadores para iniciar' },
  fullRoom: { en: 'Room is full (4 players)', es: 'Sala llena (4 jugadores)' },
  youAreSpectator: { en: "You're a spectator", es: 'Eres espectador' },
  agreeOnBet: { en: 'Agree on bet first', es: 'Primero acuerda la apuesta' },

  // Game
  stockPile: { en: 'Stock', es: 'Mazo' },
  discardPile: { en: 'Discard', es: 'Descarte' },
  cardsLeft: { en: '{n} cards left', es: '{n} cartas restantes' },
  selectCardsToMeld: { en: 'Select cards to meld', es: 'Selecciona cartas para bajar' },
  selectOneToDiscard: { en: 'Select one card to discard', es: 'Selecciona una carta para descartar' },
  invalidMeld: { en: 'Invalid meld — need a set or run of 3+', es: 'Bajada inválida — necesitas una serie o escalera de 3+' },
  forceTriggered: { en: '{name} forced you to take the card!', es: '¡{name} te forzó a tomar la carta!' },
  turnTimer: { en: 'seconds left', es: 'segundos restantes' },
  autoPass: { en: 'Time up! Auto-passing...', es: '¡Tiempo! Pasando automáticamente...' },
  discardOffered: { en: 'Discard offered — claim it?', es: '¿Tomar el descarte?' },
  drawOffered: { en: 'Draw from stock', es: 'Robar del mazo' },

  // Chat
  chatPlaceholder: { en: 'Say something...', es: 'Di algo...' },
  voice: { en: 'Voice', es: 'Voz' },
  chat: { en: 'Chat', es: 'Chat' },
  openChat: { en: 'Open Chat', es: 'Abrir Chat' },
  closeChat: { en: 'Close Chat', es: 'Cerrar Chat' },

  // Winner / End Screen
  winner: { en: 'Winner!', es: '¡Ganador!' },
  youWon: { en: 'You Won!', es: '¡Ganaste!' },
  wonTheGame: { en: '{name} Won!', es: '¡{name} Ganó!' },
  grossPot: { en: 'Gross Pot', es: 'Pozo Bruto' },
  netWinnings: { en: 'Net Winnings', es: 'Ganancias Netas' },
  roundSummary: { en: 'Round Summary', es: 'Resumen de la Ronda' },

  // Errors
  roomNotFound: { en: 'Room not found', es: 'Sala no encontrada' },
  connectionError: { en: 'Connection error — retrying...', es: 'Error de conexión — reintentando...' },
  invalidRoomCode: { en: 'Invalid room code', es: 'Código de sala inválido' },
  errorJoining: { en: 'Error joining room', es: 'Error al unirse a la sala' },
  insufficientFunds: { en: 'Insufficient balance', es: 'Saldo insuficiente' },
};

export type TranslationKey = keyof typeof translations;

export function t(key: TranslationKey, lang: Lang, vars?: Record<string, string | number>): string {
  const entry = translations[key];
  if (!entry) return key;
  let str = entry[lang] ?? entry.en;
  if (vars) {
    Object.entries(vars).forEach(([k, v]) => {
      str = str.replace(`{${k}}`, String(v));
    });
  }
  return str;
}
