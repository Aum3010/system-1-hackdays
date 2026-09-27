'use client';

import { useRef, type ReactNode, type PointerEvent } from 'react';
import type { CharacterRarity } from '@/types/game';

/**
 * Card flip-in plus a cosmetic rarity flourish (rarity never affects stats):
 * common/uncommon none, rare border shimmer, epic pointer tilt, absurd ("legendary") flash + name reveal.
 */
export function RevealCardFx({ rarity, children }: { rarity: CharacterRarity; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const tilt = (event: PointerEvent<HTMLDivElement>) => {
    if (rarity !== 'epic' || !ref.current || ref.current.closest('[data-fx=instant]')) return;
    const box = ref.current.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width - .5, y = (event.clientY - box.top) / box.height - .5;
    ref.current.style.setProperty('--tilt-x', `${(-y * 10).toFixed(2)}deg`);
    ref.current.style.setProperty('--tilt-y', `${(x * 12).toFixed(2)}deg`);
  };
  const reset = () => { ref.current?.style.setProperty('--tilt-x', '0deg'); ref.current?.style.setProperty('--tilt-y', '0deg'); };
  return <div ref={ref} className={`fx-reveal-card rarity-${rarity}`} onPointerMove={tilt} onPointerLeave={reset}>
    {children}
    {rarity === 'absurd' && <span className="fx-legendary-flash" aria-hidden="true"/>}
  </div>;
}
