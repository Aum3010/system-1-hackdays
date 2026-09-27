'use client';

import { useCountUp } from '@/hooks/useCountUp';

export function StatBar({ label, value }: { label: string; value: number }) {
  const [shown, ref] = useCountUp(value);
  return <div className="stat-row" ref={ref as React.RefObject<HTMLDivElement>}><span>{label}</span><div className="stat-track" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}><div className="fx-grow" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div><strong>{shown}</strong></div>;
}
