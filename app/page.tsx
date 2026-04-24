'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useCharacter } from '@/hooks/useCharacter';
import { useLanguage } from '@/hooks/useLanguage';
import { t } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { generateRoomCode } from '@/lib/gameLogic';
import CharacterCreation from '@/components/character/CharacterCreation';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import LanguageToggle from '@/components/layout/LanguageToggle';

export default function HomePage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const { profile, loaded, saveProfile } = useCharacter();

  const [showCharacter, setShowCharacter] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [loading, setLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  // Ref so the value is always fresh inside async callbacks and closures
  const pendingAction = useRef<'create' | 'join' | null>(null);

  // ── Ensure character profile before any action ─────────────────────────────
  const ensureProfile = (action: 'create' | 'join'): boolean => {
    if (!profile) {
      pendingAction.current = action;
      setShowCharacter(true);
      return false;
    }
    return true;
  };

  const handleProfileComplete = (data: { displayName: string; avatar: string; borderColor: string }) => {
    const p = saveProfile(data);
    const action = pendingAction.current;
    pendingAction.current = null;
    setShowCharacter(false);

    if (action === 'create') {
      createRoom(p.playerId, p.displayName, p.avatar, p.borderColor);
    } else if (action === 'join') {
      setShowJoin(true);
    }
  };

  // ── Create Room ────────────────────────────────────────────────────────────
  const createRoom = async (
    playerId: string,
    displayName: string,
    avatar: string,
    borderColor: string
  ) => {
    setLoading(true);
    setCreateError('');
    const code = generateRoomCode();

    const { error: roomErr } = await supabase.from('rooms').insert({
      code,
      host_id: playerId,
      status: 'lobby',
      pot: 0,
      bet_amount: 0,
    });

    if (roomErr) {
      console.error('[createRoom] rooms insert failed:', roomErr);
      setCreateError(
        roomErr.code === '42P01'
          ? lang === 'en'
            ? '⚠️ Database not set up. Run supabase_schema.sql in your Supabase SQL Editor first.'
            : '⚠️ La base de datos no está lista. Ejecuta supabase_schema.sql en tu Supabase SQL Editor.'
          : `Error creating room: ${roomErr.message}`
      );
      setLoading(false);
      return;
    }

    const { error: playerErr } = await supabase.from('players').insert({
      room_code: code,
      player_id: playerId,
      display_name: displayName,
      avatar,
      border_color: borderColor,
      seat_number: 1,
      is_spectator: false,
      balance: 10.0,
      is_ready: false,
      vote: null,
      is_connected: true,
    });

    if (playerErr) {
      console.error('[createRoom] players insert failed:', playerErr);
      setCreateError(`Error setting up player: ${playerErr.message}`);
      setLoading(false);
      return;
    }

    setLoading(false);
    router.push(`/room/${code}`);
  };

  const handleCreateRoom = () => {
    setCreateError('');
    if (!ensureProfile('create')) return;
    createRoom(
      profile!.playerId,
      profile!.displayName,
      profile!.avatar,
      profile!.borderColor
    );
  };

  // ── Join Room ──────────────────────────────────────────────────────────────
  const handleJoinRoom = () => {
    setCreateError('');
    if (!ensureProfile('join')) return;
    setShowJoin(true);
  };

  const handleJoinSubmit = async () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 6) {
      setJoinError(t('invalidRoomCode', lang));
      return;
    }

    setLoading(true);
    const { data: room, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('code', code)
      .single();

    if (!room || error) {
      console.error('[handleJoinSubmit] error:', error);
      setJoinError(
        error?.code === '42P01'
          ? lang === 'en'
            ? '⚠️ Database not set up yet.'
            : '⚠️ Base de datos no configurada.'
          : t('roomNotFound', lang)
      );
      setLoading(false);
      return;
    }

    setShowJoin(false);
    setLoading(false);
    router.push(`/room/${code}`);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-[#0f0f0f] flex flex-col">
      {/* Language toggle top right */}
      <div className="fixed top-4 right-4 z-50">
        <LanguageToggle />
      </div>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 text-center gap-8">
        {/* Logo */}
        <div className="space-y-2">
          <div className="text-6xl mb-2">🃏</div>
          <h1
            className="text-5xl font-bold tracking-tight text-white"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            Conquian{' '}
            <span className="text-amber-400">Social</span>
          </h1>
          <p className="text-lg text-gray-400 font-medium">{t('tagline', lang)}</p>
        </div>

        {/* Description */}
        <p className="max-w-md text-sm text-gray-500 leading-relaxed">
          {t('gameDesc', lang)}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-xs">
          <Button
            id="create-room-btn"
            variant="gold"
            size="lg"
            fullWidth
            loading={loading}
            onClick={handleCreateRoom}
          >
            🎮 {t('createRoom', lang)}
          </Button>
          <Button
            id="join-room-btn"
            variant="ghost"
            size="lg"
            fullWidth
            onClick={handleJoinRoom}
            disabled={loading}
          >
            🚪 {t('joinRoom', lang)}
          </Button>
        </div>

        {/* Error banner */}
        {createError && (
          <div className="max-w-sm w-full bg-red-950 border border-red-700 rounded-xl px-4 py-3 text-sm text-red-300 text-left space-y-1">
            <p>{createError}</p>
            {createError.includes('supabase_schema') && (
              <ol className="text-xs text-red-400 list-decimal list-inside space-y-0.5 mt-1">
                <li>Open your Supabase project dashboard</li>
                <li>Go to <strong>SQL Editor</strong></li>
                <li>Paste and run <code className="bg-red-900 px-1 rounded">supabase_schema.sql</code></li>
                <li>Go to <strong>Database → Replication</strong> and enable all 4 tables</li>
              </ol>
            )}
          </div>
        )}

        {/* How to play */}
        <div className="max-w-sm w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5 text-left space-y-3 mt-2">
          <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider">
            {lang === 'en' ? 'How to Play' : 'Cómo Jugar'}
          </h2>
          <ul className="space-y-2 text-xs text-gray-400">
            <li className="flex gap-2">
              <span className="text-amber-400 flex-shrink-0">1.</span>
              {lang === 'en'
                ? 'Deal 9 cards to each player (2–4 players)'
                : 'Se reparten 9 cartas a cada jugador (2–4 jugadores)'}
            </li>
            <li className="flex gap-2">
              <span className="text-amber-400 flex-shrink-0">2.</span>
              {lang === 'en'
                ? 'Take or pass each discard offer — claimed cards must be melded immediately'
                : 'Toma o pasa el descarte — si lo tomas, debes bajar inmediatamente'}
            </li>
            <li className="flex gap-2">
              <span className="text-amber-400 flex-shrink-0">3.</span>
              {lang === 'en'
                ? 'Meld sets (3-4 same rank) or runs (3+ same suit, ace low)'
                : 'Baja series (3-4 del mismo valor) o escaleras (3+ del mismo palo, as es bajo)'}
            </li>
            <li className="flex gap-2">
              <span className="text-amber-400 flex-shrink-0">4.</span>
              {lang === 'en'
                ? 'First to meld 10 cards wins the pot!'
                : '¡El primero en bajar 10 cartas gana el pozo!'}
            </li>
          </ul>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-gray-700">
        Conquian Social © 2024 · MonkeyTilt
      </footer>

      {/* Character Creation Modal */}
      {loaded && (
        <CharacterCreation open={showCharacter} onComplete={handleProfileComplete} />
      )}

      {/* Join Room Modal */}
      <Modal
        open={showJoin}
        onClose={() => {
          setShowJoin(false);
          setJoinCode('');
          setJoinError('');
        }}
        title={t('joinRoom', lang)}
      >
        <div className="space-y-4">
          <input
            id="join-room-code-input"
            type="text"
            value={joinCode}
            onChange={(e) => {
              setJoinCode(e.target.value.toUpperCase());
              setJoinError('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleJoinSubmit();
            }}
            placeholder={t('enterRoomCode', lang)}
            maxLength={6}
            className="w-full bg-[#111] border border-[#444] rounded-lg px-3 py-3 text-center text-xl font-mono font-bold text-white tracking-widest placeholder-gray-700 focus:outline-none focus:border-amber-500 uppercase"
          />
          {joinError && (
            <p className="text-sm text-red-400 text-center">{joinError}</p>
          )}
          <Button
            id="join-submit-btn"
            variant="gold"
            size="lg"
            fullWidth
            loading={loading}
            onClick={handleJoinSubmit}
          >
            {t('join', lang)}
          </Button>
        </div>
      </Modal>
    </main>
  );
}
