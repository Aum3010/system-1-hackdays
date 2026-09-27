'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, Upload, X } from 'lucide-react';
import { REINFORCEMENTS, REINFORCEMENT_IDS, SNAP_TIMER_SECONDS } from '@/lib/game/arenas';

/**
 * Snap Reinforcement: a 15-second scramble to photograph a nearby object.
 * Fixed-position overlay, so it never shifts the battle layout underneath.
 */
export function SnapModal({ player, onPhoto, onGiveUp }: { player: number; onPhoto: (file: File) => void; onGiveUp: () => void }) {
  const [left, setLeft] = useState(SNAP_TIMER_SECONDS);
  const deadline = useRef(Date.now() + SNAP_TIMER_SECONDS * 1000);
  const done = useRef(false);
  const giveUp = useRef(onGiveUp); giveUp.current = onGiveUp;
  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000));
      setLeft(remaining);
      if (remaining === 0 && !done.current) { done.current = true; giveUp.current(); }
    }, 200);
    return () => clearInterval(timer);
  }, []);
  const choose = (file?: File) => { if (!file || done.current) return; done.current = true; onPhoto(file); };
  return <div className="snap-modal" role="dialog" aria-modal="true" aria-labelledby="snap-title">
    <div className="snap-card">
      <p className="eyebrow"><Camera size={14}/>SNAP REINFORCEMENT</p>
      <h2 id="snap-title">Player {player}: grab something!</h2>
      <div className={`snap-timer ${left <= 5 ? 'is-urgent' : ''}`} aria-live="polite"><strong>{left}</strong>s</div>
      <ul className="snap-items">{REINFORCEMENT_IDS.map(id => <li key={id}><strong>{REINFORCEMENTS[id].name}</strong>{REINFORCEMENTS[id].examples}</li>)}</ul>
      <div className="snap-buttons">
        <label className="button primary"><Camera size={17}/>Take photo<input className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" aria-label="Take reinforcement photo" onChange={e => choose(e.target.files?.[0])}/></label>
        <label className="button secondary"><Upload size={17}/>Upload<input className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Upload reinforcement photo" onChange={e => choose(e.target.files?.[0])}/></label>
      </div>
      <button className="text-button" onClick={() => { if (!done.current) { done.current = true; onGiveUp(); } }}><X size={14}/>Give up the reinforcement</button>
    </div>
  </div>;
}
