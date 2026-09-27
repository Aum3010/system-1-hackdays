import type { AnnouncerEvent, LorePack } from '@/lib/validation/lore';
import { FALLBACK_ANNOUNCER } from '@/lib/ai/fallbackLore';

/** Picks a pre-generated announcer line (no network) and fills its placeholders. Pure and seeded. */
export function fillPlaceholders(template: string, values: { self: string; opponent: string; move: string }): string {
  return template
    .replaceAll('{self}', values.self).replaceAll('{opponent}', values.opponent).replaceAll('{move}', values.move)
    .replace(/\{[^}]*\}/g, '').replace(/\s{2,}/g, ' ').trim();
}

export function announcerLine(bank: LorePack['announcerBank'] | undefined, event: AnnouncerEvent, values: { self: string; opponent: string; move: string }, seed: number): string {
  const lines = bank?.[event]?.length ? bank[event] : FALLBACK_ANNOUNCER[event];
  const index = Math.abs(Math.imul(seed ^ 0x9e3779b1, 2654435761)) % lines.length;
  return fillPlaceholders(lines[index], values);
}
