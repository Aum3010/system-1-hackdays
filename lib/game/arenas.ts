import type { ElementType } from '@/types/game';

/** Arena Snap: one photo of the surroundings picks an arena; each arena buffs one element by 10%. */
export type ArenaId = 'kitchen' | 'desk' | 'outdoors' | 'bedroom' | 'lab' | 'street';
export const ARENA_IDS: ArenaId[] = ['kitchen', 'desk', 'outdoors', 'bedroom', 'lab', 'street'];
export const ARENA_BUFF = 1.1;
export const ARENAS: Record<ArenaId, { name: string; buff: ElementType; blurb: string }> = {
  kitchen: { name: 'Kitchen', buff: 'heat', blurb: 'Stovetop heat: HEAT fighters hit 10% harder.' },
  desk: { name: 'Desk', buff: 'metal', blurb: 'Staples and hinges: METAL fighters hit 10% harder.' },
  outdoors: { name: 'Outdoors', buff: 'nature', blurb: 'Home turf for NATURE fighters: +10% damage.' },
  bedroom: { name: 'Bedroom', buff: 'chaos', blurb: 'Laundry-pile entropy: CHAOS fighters hit 10% harder.' },
  lab: { name: 'Lab', buff: 'electric', blurb: 'Live wires everywhere: ELECTRIC fighters hit 10% harder.' },
  street: { name: 'Street', buff: 'water', blurb: 'Puddles and hydrants: WATER fighters hit 10% harder.' },
};

/** Snap Reinforcement: a mid-battle photo becomes one of four fixed items. */
export type ReinforcementItem = 'heal' | 'shield' | 'energy' | 'trap';
export const REINFORCEMENT_IDS: ReinforcementItem[] = ['heal', 'shield', 'energy', 'trap'];
export const REINFORCEMENTS: Record<ReinforcementItem, { name: string; effect: string; examples: string }> = {
  heal: { name: 'Heal', effect: 'Restores 25% max HP.', examples: 'food, drinks, bandages, plants, soap' },
  shield: { name: 'Shield', effect: 'Halves the next 2 hits taken.', examples: 'books, lids, boxes, helmets, cases, trays' },
  energy: { name: 'Energy', effect: '+3 energy.', examples: 'batteries, chargers, coffee, snacks, electronics' },
  trap: { name: 'Trap', effect: 'The rival’s next hit is halved and they take 10 damage.', examples: 'tape, clips, string, rubber bands, sticky or tangly things' },
};
export const SNAP_TIMER_SECONDS = 15;
