'use client';

import { useLanguage } from '@/hooks/useLanguage';

export default function LanguageToggle() {
  const { lang, setLang } = useLanguage();

  return (
    <div
      className="flex items-center bg-[#1c1c1c] border border-[#333] rounded-full p-0.5 gap-0.5"
      role="group"
      aria-label="Language selector"
    >
      <button
        id="lang-en"
        onClick={() => setLang('en')}
        className={`px-3 py-1 text-xs font-bold rounded-full transition-all duration-200 ${
          lang === 'en'
            ? 'bg-amber-700 text-amber-100'
            : 'text-gray-400 hover:text-white'
        }`}
        aria-pressed={lang === 'en'}
      >
        EN
      </button>
      <button
        id="lang-es"
        onClick={() => setLang('es')}
        className={`px-3 py-1 text-xs font-bold rounded-full transition-all duration-200 ${
          lang === 'es'
            ? 'bg-amber-700 text-amber-100'
            : 'text-gray-400 hover:text-white'
        }`}
        aria-pressed={lang === 'es'}
      >
        ES
      </button>
    </div>
  );
}
