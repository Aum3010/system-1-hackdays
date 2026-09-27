import type { ElementType } from '@/types/game';

/** CSS-only confetti burst in the winner's element colour. Decorative; hidden in instant/reduced-motion mode. */
export const TYPE_COLORS: Record<ElementType, string[]> = {
  water: ['#82b6d6', '#b9d7f1', '#ffffff'], heat: ['#f39c83', '#e0533d', '#ffd29a'], electric: ['#e6df83', '#fff27a', '#7450ea'],
  nature: ['#aabd61', '#d8ef74', '#6b8e23'], metal: ['#b8b8ad', '#e8e8df', '#7450ea'], chaos: ['#cabcfa', '#7450ea', '#d8ef74'],
};
// Deterministic pseudo-random spread so server and client markup always match.
const PIECES = Array.from({ length: 42 }, (_, i) => ({
  left: (i * 37) % 100, delay: (i * 53) % 700, drift: ((i * 29) % 160) - 80, spin: 180 + (i * 67) % 540, size: 6 + (i * 13) % 7, shape: i % 3,
}));

export function Confetti({ type }: { type: ElementType }) {
  const colors = TYPE_COLORS[type];
  return <div className="fx-confetti" aria-hidden="true">
    {PIECES.map((p, i) => <span key={i} className={`shape-${p.shape}`} style={{
      left: `${p.left}%`, width: p.size, height: p.shape === 1 ? p.size : p.size * 1.6, background: colors[i % colors.length],
      animationDelay: `${p.delay}ms`, ['--drift' as string]: `${p.drift}px`, ['--spin' as string]: `${p.spin}deg`,
    }}/>)}
  </div>;
}
