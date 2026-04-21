'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { useLanguage } from '@/hooks/useLanguage';
import { t } from '@/lib/i18n';
import { CharacterProfile } from '@/hooks/useCharacter';
import LanguageToggle from '@/components/layout/LanguageToggle';

const AVATARS = ['🦅', '🐺', '🦁', '🐉', '🦊', '🐻', '🦋', '🌵', '🌊', '🎯', '🎲', '🃏'];
const BORDER_COLORS = [
  { name: 'gold', label: { en: 'Gold', es: 'Oro' }, color: '#c9a84c' },
  { name: 'red', label: { en: 'Red', es: 'Rojo' }, color: '#dc2626' },
  { name: 'blue', label: { en: 'Blue', es: 'Azul' }, color: '#3b82f6' },
  { name: 'green', label: { en: 'Green', es: 'Verde' }, color: '#22c55e' },
  { name: 'purple', label: { en: 'Purple', es: 'Morado' }, color: '#a855f7' },
  { name: 'white', label: { en: 'White', es: 'Blanco' }, color: '#f5f5f5' },
];

interface CharacterCreationProps {
  open: boolean;
  onComplete: (profile: Omit<CharacterProfile, 'playerId'>) => void;
}

export default function CharacterCreation({ open, onComplete }: CharacterCreationProps) {
  const { lang } = useLanguage();
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [borderColor, setBorderColor] = useState('gold');
  const [errors, setErrors] = useState<{ name?: string; avatar?: string }>({});

  const validate = () => {
    const e: typeof errors = {};
    if (!name.trim()) e.name = t('nameRequired', lang);
    if (!avatar) e.avatar = t('avatarRequired', lang);
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onComplete({ displayName: name.trim(), avatar, borderColor });
  };

  return (
    <Modal open={open} onClose={() => {}} maxWidth="max-w-lg">
      <div className="flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">{t('characterTitle', lang)}</h1>
            <p className="text-sm text-gray-400 mt-0.5">Conquian Social</p>
          </div>
          <LanguageToggle />
        </div>

        {/* Name */}
        <div className="space-y-1.5">
          <label htmlFor="player-name" className="text-sm font-medium text-gray-300">
            {t('yourName', lang)}
          </label>
          <input
            id="player-name"
            type="text"
            maxLength={20}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('namePlaceholder', lang)}
            className={`w-full bg-[#111] border ${errors.name ? 'border-red-500' : 'border-[#444]'} rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 transition-colors`}
          />
          {errors.name && <p className="text-xs text-red-400">{errors.name}</p>}
        </div>

        {/* Avatar grid */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">{t('chooseAvatar', lang)}</label>
          <div className="grid grid-cols-6 gap-2">
            {AVATARS.map((emoji) => (
              <button
                key={emoji}
                id={`avatar-${emoji}`}
                type="button"
                onClick={() => setAvatar(emoji)}
                className={`text-2xl w-full aspect-square rounded-xl flex items-center justify-center transition-all hover:scale-110 ${
                  avatar === emoji
                    ? 'bg-amber-700 border-2 border-amber-400 scale-110'
                    : 'bg-[#1c1c1c] border-2 border-transparent hover:border-[#444]'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
          {errors.avatar && <p className="text-xs text-red-400">{errors.avatar}</p>}
        </div>

        {/* Border color */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">{t('chooseBorderColor', lang)}</label>
          <div className="flex gap-3">
            {BORDER_COLORS.map((bc) => (
              <button
                key={bc.name}
                id={`border-color-${bc.name}`}
                type="button"
                onClick={() => setBorderColor(bc.name)}
                title={bc.label[lang]}
                className={`w-8 h-8 rounded-full transition-all border-2 hover:scale-110 ${
                  borderColor === bc.name ? 'scale-125 border-white' : 'border-transparent'
                }`}
                style={{ backgroundColor: bc.color }}
              />
            ))}
          </div>
        </div>

        {/* Preview */}
        {avatar && (
          <div className="flex items-center gap-3 bg-[#1a1a1a] rounded-xl p-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center border-3 text-2xl bg-[#111]"
              style={{ borderColor: BORDER_COLORS.find((b) => b.name === borderColor)?.color, borderWidth: 3 }}
            >
              {avatar}
            </div>
            <div>
              <p className="text-sm font-bold text-white">{name || '...'}</p>
              <p className="text-xs text-gray-400">${(10).toFixed(2)}</p>
            </div>
          </div>
        )}

        <Button
          id="lets-play-btn"
          variant="gold"
          size="lg"
          fullWidth
          onClick={handleSubmit}
        >
          {t('letsPlay', lang)}
        </Button>
      </div>
    </Modal>
  );
}
