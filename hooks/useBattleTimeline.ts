'use client';

import { useEffect, useRef, useState } from 'react';
import type { BattleState, PlayerSlot } from '@/types/battle';
import { deriveTimeline, instantTimeline, type CalloutTone, type FxEvent } from '@/lib/fx/timeline';

export interface TimelineView {
  playing: boolean;
  countdown: 3 | 2 | 1 | null;
  revealed: boolean;
  callouts: { text: string; tone: CalloutTone; key: number }[];
  traits: Partial<Record<PlayerSlot, string>>;
  hitstop: boolean;
  hits: Partial<Record<PlayerSlot, { amount: number; heavy: boolean; key: number }>>;
  hp: Record<PlayerSlot, number>;
  energy: Record<PlayerSlot, number>;
  line: { slot: PlayerSlot; text: string; key: number } | null;
  announce: { text: string; key: number } | null;
  ko: PlayerSlot | null;
}
const idle = (): TimelineView => ({
  playing: false, countdown: null, revealed: true, callouts: [], traits: {}, hitstop: false, hits: {},
  hp: { player1: 0, player2: 0 }, energy: { player1: 0, player2: 0 }, line: null, announce: null, ko: null,
});

/**
 * Replays the animation script for the newest round. Game state is already final; this only
 * controls what the screen shows and when. `prev` is the state before the round (null after a
 * rematch). Timers are cancelled on unmount/restart and any error shows the final state at once.
 */
export function useBattleTimeline(prev: BattleState | null, battle: BattleState, instant: boolean, onFx?: (event: FxEvent) => void, onDone?: () => void): TimelineView {
  const [view, setView] = useState<TimelineView>(idle);
  const latest = useRef({ prev, battle, onFx, onDone });
  latest.current = { prev, battle, onFx, onDone };

  useEffect(() => {
    const { prev: before, battle: after } = latest.current;
    if (!before || after.round !== before.round + 1) { setView(idle()); return; }
    const timers: ReturnType<typeof setTimeout>[] = [];
    let key = 0;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      // Keep the round's text callouts and one-liner on screen; they fade via CSS.
      setView(v => ({ ...idle(), callouts: v.callouts, line: v.line, announce: v.announce, traits: v.traits, ko: v.ko, hits: instant ? {} : v.hits }));
      latest.current.onDone?.();
    };
    const apply = (event: FxEvent) => {
      latest.current.onFx?.(event);
      setView(v => {
        switch (event.type) {
          case 'countdown': return { ...v, countdown: event.value };
          case 'reveal': return { ...v, countdown: null, revealed: true };
          case 'callout': return { ...v, countdown: null, revealed: true, callouts: [...v.callouts, { text: event.text, tone: event.tone, key: ++key }] };
          case 'trait': return { ...v, traits: { ...v.traits, [event.slot]: event.name } };
          case 'hitstop': return { ...v, hitstop: true };
          case 'hit': return { ...v, hitstop: false, hits: { ...v.hits, [event.target]: { amount: event.amount, heavy: event.heavy, key: ++key } } };
          case 'hp': return { ...v, hp: { ...v.hp, [event.target]: event.to } };
          case 'energy': return { ...v, energy: { ...v.energy, [event.slot]: event.to } };
          case 'line': return { ...v, line: { slot: event.slot, text: event.text, key: ++key } };
          case 'announce': return { ...v, announce: { text: event.text, key: ++key } };
          case 'ko': return { ...v, ko: event.loser };
          case 'done': return v;
        }
      });
    };
    try {
      const steps = instant ? instantTimeline(before, after) : deriveTimeline(before, after, { slowMo: true });
      setView({ ...idle(), playing: true, revealed: false, hp: { player1: before.player1Hp, player2: before.player2Hp }, energy: { ...before.energy } });
      for (const step of steps) {
        const run = () => { try { if (step.event.type === 'done') finish(); else apply(step.event); } catch { finish(); } };
        if (instant) run(); else timers.push(setTimeout(run, step.at));
      }
    } catch {
      finish();
    }
    return () => { timers.forEach(clearTimeout); };
    // Replays only when a new round lands (not when a reinforcement edits the same round).
  }, [battle.round, battle.player1.id, battle.player2.id, instant]);

  return view;
}
