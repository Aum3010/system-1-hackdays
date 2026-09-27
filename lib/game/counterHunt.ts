import type { ElementType, GameCharacter } from '@/types/game';
import { TYPE_ADVANTAGES } from './typeChart';
import { clampStat } from './statEngine';

/** Counter-Hunt: Player 2 races a 60 s clock to photograph an object that counters Player 1. */
export const HUNT_SECONDS = 60;
const EXAMPLES: Record<ElementType, string> = {
  water: 'bottles, cups, umbrellas', heat: 'mugs, kettles, lamps', electric: 'phones, laptops, chargers',
  nature: 'plants, fruit, wood, paper', metal: 'tools, keys, cans', chaos: 'anything weird',
};

/** Element(s) that beat `target`. Metal and Chaos have no weakness. */
export function countersFor(target: ElementType): ElementType[] {
  return (Object.keys(TYPE_ADVANTAGES) as ElementType[]).filter(type => TYPE_ADVANTAGES[type] === target);
}
export function huntHint(target: ElementType): string {
  const counters = countersFor(target);
  if (!counters.length) return `${target.toUpperCase()} has no weakness. Beat the clock for a speed bonus.`;
  return `Find something ${counters.map(c => c.toUpperCase()).join(' or ')} (${counters.map(c => EXAMPLES[c]).join('; ')}).`;
}

/** Pure: applies the bonus earned by `hunter` against `target` for a photo taken after `secondsUsed`. */
export function applyHuntBonus(target: GameCharacter, hunter: GameCharacter, secondsUsed: number): { fighter: GameCharacter; summary: string | null } {
  if (secondsUsed > HUNT_SECONDS) return { fighter: hunter, summary: null };
  const countered = countersFor(target.type.primary).includes(hunter.type.primary);
  const speed = Math.max(2, Math.round(10 * (1 - secondsUsed / HUNT_SECONDS)));
  const attack = countered ? 8 : 0, defense = countered ? 4 : 0;
  const parts = [attack && `+${attack} ATK`, defense && `+${defense} DEF`, `+${speed} SPD`].filter(Boolean).join(' ');
  const badge = `${countered ? 'Counter-Hunter' : 'Speed-Hunter'} ${parts}`;
  return {
    fighter: {
      ...hunter,
      combat: { ...hunter.combat, attack: clampStat(hunter.combat.attack + attack), defense: clampStat(hunter.combat.defense + defense), speed: clampStat(hunter.combat.speed + speed) },
      badges: [...(hunter.badges ?? []), badge].slice(-4),
    },
    summary: `${countered ? 'Counter found!' : 'No type counter, but fast.'} ${parts} in ${Math.round(secondsUsed)}s.`,
  };
}
