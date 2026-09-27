import type { Metadata } from 'next';
import './globals.css';
import './animations.css';
import './features.css';

export const metadata: Metadata = {
  title: 'Object Arena — Everything is playable.',
  description: 'Snap it. Spawn it. Battle it. Turn everyday objects into extraordinary fighters.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
