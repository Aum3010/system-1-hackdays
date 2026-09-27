import { Megaphone } from 'lucide-react';
import type { BattleMove } from '@/types/battle';
import type { CalloutTone } from '@/lib/fx/timeline';

/**
 * Presentation-only overlays for the battle reveal. Every element here is absolutely
 * positioned inside an existing container, so none of them can shift layout.
 */
const LABEL: Record<BattleMove, string> = { strike: 'STRIKE', guard: 'GUARD', break: 'BREAK', special: 'SPECIAL', snap: 'SNAP' };

export function FxCenter({ countdown, callouts }: { countdown: 3 | 2 | 1 | null; callouts: { text: string; tone: CalloutTone; key: number }[] }) {
  if (!countdown && !callouts.length) return null;
  return <div className="fx-center" aria-hidden="true">
    {countdown && <span key={countdown} className="fx-countdown">{countdown}</span>}
    {!countdown && callouts.map((c, i) => <span key={c.key} className={`fx-callout tone-${c.tone}`} style={{ top: `${i * 46}px` }}>{c.tone === 'call' && <Megaphone size={20}/>}{c.text}</span>)}
  </div>;
}

/** Face-down card that flips to show the move (rotateY). */
export function MoveCard({ move, revealed, called }: { move: BattleMove; revealed: boolean; called: boolean }) {
  return <div className={`fx-move-card ${revealed ? 'is-revealed' : ''}`} aria-hidden="true">
    <div className="fx-move-inner">
      <span className="fx-move-face fx-move-back">?</span>
      <span className={`fx-move-face fx-move-front move-${move}`}>{LABEL[move]}{called && <small>CALLED</small>}</span>
    </div>
  </div>;
}

export function DamageNumber({ amount, heavy }: { amount: number; heavy: boolean }) {
  return <span className={`fx-damage ${heavy ? 'is-heavy' : ''}`} aria-hidden="true">−{amount}</span>;
}

export function LineBubble({ text }: { text: string }) {
  return <span className="fx-line" role="status">“{text}”</span>;
}

export function TraitTag({ name }: { name: string }) {
  return <span className="fx-trait" aria-hidden="true">★ {name.toUpperCase()}!</span>;
}
