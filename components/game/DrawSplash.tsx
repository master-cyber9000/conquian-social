'use client';

import { useLanguage } from '@/hooks/useLanguage';
import { t } from '@/lib/i18n';
import Button from '@/components/ui/Button';

interface DrawSplashProps {
  newPot: number;
  onContinue: () => void;
}

export default function DrawSplash({ newPot, onContinue }: DrawSplashProps) {
  const { lang } = useLanguage();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md fade-in">
      <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl p-8 max-w-sm w-full mx-4 text-center space-y-5 shadow-2xl">
        <div className="text-4xl">🤝</div>
        <h2 className="text-xl font-bold text-yellow-400">{t('drawPot', lang)}</h2>
        <div className="bg-[#111] rounded-xl p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">{t('pot', lang)}</div>
          <div className="text-3xl font-bold text-amber-400">${newPot.toFixed(2)}</div>
        </div>
        <Button id="continue-game-btn" variant="gold" fullWidth onClick={onContinue}>
          {lang === 'en' ? 'Continue' : 'Continuar'}
        </Button>
      </div>
    </div>
  );
}
