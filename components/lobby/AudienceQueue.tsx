'use client';

import { Player } from '@/lib/supabase';
import { useLanguage } from '@/hooks/useLanguage';

const BORDER_COLORS: Record<string, string> = {
  gold: '#c9a84c',
  red: '#dc2626',
  blue: '#3b82f6',
  green: '#22c55e',
  purple: '#a855f7',
  white: '#f5f5f5',
};

interface AudienceQueueProps {
  spectators: Player[];
}

export default function AudienceQueue({ spectators }: AudienceQueueProps) {
  const { lang } = useLanguage();
  if (spectators.length === 0) return null;

  const queued = spectators.filter(s => s.vote === 'queue').sort((a,b) => a.player_id.localeCompare(b.player_id));
  const idle = spectators.filter(s => s.vote !== 'queue');
  const nextUp = queued[0];

  return (
    <div className="flex flex-col gap-2 w-48 bg-[#151515] border border-[#333] rounded-xl p-3 shrink-0 h-fit max-h-[80vh] overflow-y-auto custom-scrollbar">
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 border-b border-[#333] pb-2">
        {lang === 'en' ? 'Audience' : 'Audiencia'}
      </h3>
      
      <div className="flex flex-col gap-4">
        {queued.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-[10px] text-[#22c55e] font-semibold uppercase tracking-widest">{lang === 'en' ? 'In Queue' : 'En Cola'}</span>
            {queued.map((p) => {
              const bColor = BORDER_COLORS[p.border_color] ?? '#fff';
              const isNext = p.player_id === nextUp.player_id;
              return (
                <div key={p.player_id} className={`flex items-center gap-3 p-1.5 rounded-lg transition-colors ${isNext ? 'bg-amber-900/20 border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.15)]' : 'border border-transparent'}`}>
                  <div className="w-8 h-8 rounded-full border-[1.5px] flex items-center justify-center shrink-0" style={{ borderColor: bColor }}>
                    <span className="text-sm leading-none">{p.avatar}</span>
                  </div>
                  <div className="flex flex-col truncate">
                    <span className={`text-xs truncate font-semibold ${isNext ? 'text-amber-100' : 'text-gray-200'}`} title={p.display_name}>{p.display_name}</span>
                    {isNext && (
                      <span className="text-[9px] text-amber-500 uppercase font-bold animate-pulse">{lang === 'en' ? 'Next Up' : 'Siguiente'}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {idle.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-widest">{lang === 'en' ? 'Watching' : 'Viendo'}</span>
            {idle.map((p) => {
              const bColor = BORDER_COLORS[p.border_color] ?? '#fff';
              return (
                <div key={p.player_id} className="flex items-center gap-3 p-1.5 opacity-60 hover:opacity-100 transition-opacity">
                  <div className="w-6 h-6 rounded-full border flex items-center justify-center shrink-0" style={{ borderColor: bColor }}>
                    <span className="text-[10px] leading-none">{p.avatar}</span>
                  </div>
                  <div className="flex flex-col truncate">
                    <span className="text-xs text-gray-400 truncate" title={p.display_name}>{p.display_name}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
