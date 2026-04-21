import type { Metadata } from 'next';
import './globals.css';
import { LanguageProvider } from '@/hooks/useLanguage';

export const metadata: Metadata = {
  title: 'Conquian Social — Play with family. Bet with friends.',
  description:
    'A real-time multiplayer Conquian card game. Play with up to 4 players, place bets, and use voice chat. Available in English and Spanish.',
  keywords: ['conquian', 'card game', 'multiplayer', 'mexican rummy', 'juego de cartas'],
  openGraph: {
    title: 'Conquian Social',
    description: 'Play with family. Bet with friends.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="min-h-screen bg-[#111] text-white antialiased">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
