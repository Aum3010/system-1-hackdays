import type { BattleLineEvent, TraitLevel } from './object';
import type { LorePack } from '@/lib/validation/lore';
import type { JargonRuleId } from '@/lib/game/jargon';
export type CombatClass = 'tank' | 'fighter' | 'speedster' | 'trickster' | 'balanced' | 'glass_cannon' | 'support';
export type ElementType = 'heat' | 'water' | 'electric' | 'nature' | 'metal' | 'chaos';
/** Each fighter bends exactly one combat rule. Catalog + rule text: lib/game/traits.ts. */
export type SignatureTrait = 'pierce' | 'crush' | 'charged' | 'cushion' | 'flow' | 'shatter' | 'snare' | 'scald' | 'rebound' | 'rush' | 'bulwark' | 'slippery';
export type StatKey = 'attack' | 'defense' | 'health' | 'speed';
/** What Laya decided for a fighter, kept for display. Absent when the fallback rules decided everything. */
export interface LayaRead {
 /** Laya's element pick and calibrated confidence; `used` is false when a code rule overrode it. */
 primaryType?: {choice: ElementType; confidence: number; used: boolean};
 /** Stat points Laya's 0-4 ratings added or removed (bounded, see statEngine). */
 statNudge?: Record<StatKey, number>;
}
export interface CharacterDecision {combatClass: CombatClass; primaryType: ElementType; secondaryType?: ElementType; attackTier: TraitLevel; defenseTier: TraitLevel; healthTier: TraitLevel; speedTier: TraitLevel; signatureTrait?: SignatureTrait; decisionProvider: 'laya' | 'fallback'; layaRead?: LayaRead}
export interface Ability {name: string; description?: string; power?: number; cooldown?: number}
export type CharacterRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'absurd';
export interface GameCharacter {
 id: string; sourceImage: string;
 object: {name: string; category: string; materials: string[]; confidence: number};
 identity: {name: string; description: string; rarity: CharacterRarity};
 type: {primary: ElementType; secondary?: ElementType};
 combat: {class: CombatClass; hp: number; maxHp: number; attack: number; defense: number; speed: number};
 abilities: {normalAttack: Ability; specialAttack: Ability; passive?: Ability};
 trait?: SignatureTrait;
 /** Fixed rule attached to the Special (effects are opt-in in the engine). */
 jargon?: JargonRuleId;
 /** Gemini (or canned) flavor text. Text only; never affects numbers. */
 lore?: LorePack;
 loreSource?: 'gemini' | 'fallback';
 /** Earned perks shown on the card, e.g. from Counter-Hunt. */
 badges?: string[];
 /** Laya's decisions for this fighter (display only; already applied to type and stats). */
 layaRead?: LayaRead;
 personality: {trashTalk?: string; temperament?: string; lines?: Partial<Record<BattleLineEvent, string>>};
 context?: {environment?: string; environmentalBuff?: string};
 metadata: {createdAt: string; aiProvider: string; decisionProvider: 'laya' | 'fallback'};
}
