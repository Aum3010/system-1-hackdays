'use client';

import { useEffect, useState } from 'react';
import type { GameCharacter } from '@/types/game';
import { lineFor } from '@/lib/fx/timeline';

/**
 * ~2 s decorative intro before round 1: fighters slide in from opposite sides, VS pops.
 * Fixed overlay with pointer-events: none, so picks (keys or clicks) are never blocked.
 */
export function VsIntro({ fighters, matchKey, instant }: { fighters: [GameCharacter, GameCharacter]; matchKey: string; instant: boolean }) {
  const [shownFor, setShownFor] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (instant || shownFor === matchKey) return;
    setShownFor(matchKey); setVisible(true);
    const timer = setTimeout(() => setVisible(false), 2100);
    return () => clearTimeout(timer);
  }, [matchKey, instant, shownFor]);
  if (!visible || instant) return null;
  return <div className="fx-vs-intro" aria-hidden="true">
    {fighters.map((fighter, i) => <div key={fighter.id} className={`fx-intro-fighter side-${i}`}>
      <img src={fighter.sourceImage} alt=""/>
      <strong>{fighter.identity.name}</strong>
      <span>“{lineFor(fighter, 'opener')}”</span>
    </div>)}
    <span className="fx-intro-vs">VS</span>
  </div>;
}
