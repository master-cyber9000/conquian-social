'use client';

import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { useLanguage } from '@/hooks/useLanguage';
import { t } from '@/lib/i18n';
import { calculatePayout } from '@/lib/gameLogic';
import { Player } from '@/lib/supabase';
import Button from '@/components/ui/Button';

interface WinnerSplashProps {
  winner: Player;
  allPlayers: Player[];
  pot: number;
  isLocalWinner: boolean;
  onPlayAgain: () => void;
  onNewBet: () => void;
}

export default function WinnerSplash({
  winner,
  allPlayers,
  pot,
  isLocalWinner,
  onPlayAgain,
  onNewBet,
}: WinnerSplashProps) {
  const { lang } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { gross, fee, net } = calculatePayout(pot);

  useEffect(() => {
    if (!isLocalWinner) return;
    const end = Date.now() + 3000;
    const frame = () => {
      confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#c9a84c', '#ffffff', '#22c55e'] });
      confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#c9a84c', '#ffffff', '#22c55e'] });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, [isLocalWinner]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md fade-in">
      <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl p-8 max-w-sm w-full mx-4 text-center space-y-6 shadow-2xl">
        {/* Winner avatar */}
        <div className="flex flex-col items-center gap-2">
          <div className="text-5xl mb-1 animate-bounce">{winner.avatar}</div>
          <h2 className="text-2xl font-bold text-amber-400">
            {isLocalWinner ? t('youWon', lang) : t('wonTheGame', lang, { name: winner.display_name })}
          </h2>
          <p className="text-sm text-gray-400">🏆 {winner.display_name}</p>
        </div>

        {/* Pot breakdown */}
        <div className="bg-[#111] rounded-xl p-4 space-y-2 text-left">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
            {t('roundSummary', lang)}
          </h3>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">{t('grossPot', lang)}</span>
            <span className="text-white font-mono">${gross.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">{t('platformFee', lang)}</span>
            <span className="text-red-400 font-mono">-${fee.toFixed(2)}</span>
          </div>
          <div className="w-full h-px bg-[#2a2a2a] my-1" />
          <div className="flex justify-between text-base font-bold">
            <span className="text-gray-300">{t('netWinnings', lang)}</span>
            <span className="text-green-400 font-mono">${net.toFixed(2)}</span>
          </div>
        </div>

        {/* Balance changes */}
        <div className="space-y-1">
          {allPlayers.filter(p => !p.is_spectator).map((p) => {
            const delta = p.player_id === winner.player_id ? net : -pot / Math.max(allPlayers.filter(a => !a.is_spectator).length - 1, 1);
            return (
              <div key={p.player_id} className="flex items-center justify-between text-xs">
                <span className="text-gray-400">{p.avatar} {p.display_name}</span>
                <span className={delta > 0 ? 'text-green-400' : 'text-red-400'}>
                  {delta > 0 ? '+' : ''}{delta.toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button id="play-again-btn" variant="primary" fullWidth onClick={onPlayAgain}>
            {t('playAgain', lang)}
          </Button>
          <Button id="new-bet-btn" variant="ghost" fullWidth onClick={onNewBet}>
            {t('newBet', lang)}
          </Button>
        </div>
      </div>
    </div>
  );
}
