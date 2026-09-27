'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';

/** Counts from 0 to `target` over `ms` (presentation only). Instant under Skip animations or reduced motion. */
export function useCountUp(target: number, ms = 600): [number, RefObject<HTMLElement | null>] {
  const ref = useRef<HTMLElement | null>(null);
  const [value, setValue] = useState(target);
  useEffect(() => {
    const instant = !!ref.current?.closest('[data-fx=instant]') || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (instant) { setValue(target); return; }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    setValue(0);
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, ms]);
  return [value, ref];
}
