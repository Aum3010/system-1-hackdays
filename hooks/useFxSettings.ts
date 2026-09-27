'use client';

import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_SPICE, SPICES, type Spice } from '@/lib/ai/persona';

export const FX_STORAGE_KEY = 'object-arena-fx-v1';
export interface FxSettings { skip: boolean; muted: boolean; spice: Spice }
const DEFAULTS: FxSettings = { skip: false, muted: true, spice: DEFAULT_SPICE };

/** Animation/sound preferences. Reduced motion always behaves like "skip". Storage failures are ignored. */
export function useFxSettings() {
  const [settings, setSettings] = useState<FxSettings>(DEFAULTS);
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(FX_STORAGE_KEY) || 'null');
      if (saved && typeof saved === 'object') {
        const s = saved as Partial<FxSettings>;
        setSettings({ skip: s.skip === true, muted: s.muted !== false, spice: SPICES.includes(s.spice as Spice) ? s.spice as Spice : DEFAULT_SPICE });
      }
    } catch { /* optional */ }
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!media) return;
    setReducedMotion(media.matches);
    const onChange = () => setReducedMotion(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);
  const update = useCallback((patch: Partial<FxSettings>) => setSettings(current => {
    const next = { ...current, ...patch };
    try { localStorage.setItem(FX_STORAGE_KEY, JSON.stringify(next)); } catch { /* optional */ }
    return next;
  }), []);
  return { ...settings, reducedMotion, instant: settings.skip || reducedMotion, update };
}
