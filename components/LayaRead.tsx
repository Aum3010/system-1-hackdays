import { Cpu } from 'lucide-react';
import type { GameCharacter, StatKey } from '@/types/game';

const LABEL: Record<StatKey, string> = { health: 'HP', attack: 'ATK', defense: 'DEF', speed: 'SPD' };

/** Reveal-screen panel: what Laya decided for this fighter. Hidden for fallback fighters. */
export function LayaRead({ character }: { character: GameCharacter }) {
  const read = character.layaRead;
  if (!read || character.metadata.decisionProvider !== 'laya') return null;
  const nudges = read.statNudge ? (Object.keys(LABEL) as StatKey[]).filter(k => read.statNudge![k] !== 0) : [];
  return <section className="laya-read" aria-label="Laya's read">
    <p className="mono"><Cpu size={12}/>LAYA&apos;S READ</p>
    {read.primaryType && <p>Element: <b>{read.primaryType.choice.toUpperCase()}</b> ({Math.round(read.primaryType.confidence * 100)}% sure){read.primaryType.used ? '' : ` · kept ${character.type.primary.toUpperCase()} from the object's physical signals`}</p>}
    {nudges.length > 0 && <p className="laya-nudges">{nudges.map(k => <span key={k} className={read.statNudge![k] > 0 ? 'up' : 'down'}>{LABEL[k]} {read.statNudge![k] > 0 ? '+' : ''}{read.statNudge![k]}</span>)}</p>}
  </section>;
}
