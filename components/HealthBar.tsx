'use client';

import { useEffect, useState } from 'react';

/** HP bar. The optional ghost bar trails behind damage (presentation only; hidden when nothing is trailing). */
export function HealthBar({ name, hp, maxHp }: { name: string; hp: number; maxHp: number }) {
  const percent = Math.max(0, Math.min(100, hp / maxHp * 100));
  const [ghost, setGhost] = useState(percent);
  useEffect(() => {
    if (percent >= ghost) { setGhost(percent); return; }
    const timer = setTimeout(() => setGhost(percent), 450);
    return () => clearTimeout(timer);
  }, [percent, ghost]);
  return <div className="health"><div className="health-label"><span>HEALTH</span><strong>{hp}<small> / {maxHp} HP</small></strong></div><div className={`health-track ${percent < 30 ? 'critical' : ''}`} role="meter" aria-label={`${name} health`} aria-valuemin={0} aria-valuemax={maxHp} aria-valuenow={hp}><span className="hp-ghost" aria-hidden="true" style={{ transform: `scaleX(${Math.max(ghost, percent) / 100})` }}/><div className="hp-fill" style={{ width: `${percent}%` }} /></div></div>;
}
