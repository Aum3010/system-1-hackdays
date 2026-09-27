import { z } from 'zod';
import { loreSchema } from './lore';

export const traitLevelSchema = z.enum(['very_low', 'low', 'medium', 'high', 'very_high']);
export const combatClassSchema = z.enum(['tank', 'fighter', 'speedster', 'trickster', 'balanced', 'glass_cannon', 'support']);
export const elementTypeSchema = z.enum(['heat', 'water', 'electric', 'nature', 'metal', 'chaos']);
export const signatureTraitSchema = z.enum(['pierce', 'crush', 'charged', 'cushion', 'flow', 'shatter', 'snare', 'scald', 'rebound', 'rush', 'bulwark', 'slippery']);
const statNudgeSchema = z.number().int().min(-10).max(10);
export const layaReadSchema = z.object({
  primaryType: z.object({choice: elementTypeSchema, confidence: z.number().min(0).max(1), used: z.boolean()}).optional(),
  statNudge: z.object({attack: statNudgeSchema, defense: statNudgeSchema, health: statNudgeSchema, speed: statNudgeSchema}).optional(),
});
export const battleLineEventSchema = z.enum(['opener', 'counter', 'guardBreak', 'special', 'calledIt', 'comeback', 'knockout', 'ouch']);
const shortText = (max: number) => z.string().trim().min(1).max(max);
const battleLinesSchema = z.object({
  opener: shortText(90).optional(), counter: shortText(90).optional(), guardBreak: shortText(90).optional(), special: shortText(90).optional(),
  calledIt: shortText(90).optional(), comeback: shortText(90).optional(), knockout: shortText(90).optional(), ouch: shortText(90).optional(),
});

export const objectAnalysisSchema = z.object({
  objectName: shortText(80), category: shortText(60), confidence: z.number().min(0).max(1),
  materials: z.array(shortText(40)).min(1).max(10),
  properties: z.object({
    durability: traitLevelSchema, mobility: traitLevelSchema, weight: traitLevelSchema,
    sharpness: traitLevelSchema, fragility: traitLevelSchema, flexibility: traitLevelSchema,
    electronic: z.boolean(),
  }),
  environment: shortText(120).optional(), rejected: z.literal(false).optional(),
  creative: z.object({
    suggestedCharacterName: shortText(40), suggestedDescription: shortText(240),
    suggestedSpecialAbility: shortText(50), suggestedPassiveAbility: shortText(50).optional(),
    trashTalk: shortText(140).optional(), battleLines: battleLinesSchema.optional(),
  }),
});
export const objectRejectionSchema = z.object({rejected: z.literal(true), rejectionReason: shortText(180)});
export const objectResultSchema = z.union([objectRejectionSchema, objectAnalysisSchema]);

export const characterDecisionSchema = z.object({
  combatClass: combatClassSchema, primaryType: elementTypeSchema, secondaryType: elementTypeSchema.optional(),
  attackTier: traitLevelSchema, defenseTier: traitLevelSchema, healthTier: traitLevelSchema, speedTier: traitLevelSchema,
  signatureTrait: signatureTraitSchema.optional(),
  decisionProvider: z.enum(['laya', 'fallback']),
  layaRead: layaReadSchema.optional(),
});
const abilitySchema = z.object({name: shortText(60), description: shortText(240).optional(), power: z.number().min(0).max(200).optional(), cooldown: z.number().int().min(0).max(100).optional()});
const stat = z.number().int().min(20).max(100);
export const gameCharacterSchema = z.object({
  id: shortText(100), sourceImage: z.string().min(1).max(3_000_000),
  object: z.object({name: shortText(80), category: shortText(60), materials: z.array(shortText(40)).min(1).max(10), confidence: z.number().min(0).max(1)}),
  identity: z.object({name: shortText(40), description: shortText(240), rarity: z.enum(['common', 'uncommon', 'rare', 'epic', 'absurd'])}),
  type: z.object({primary: elementTypeSchema, secondary: elementTypeSchema.optional()}),
  combat: z.object({class: combatClassSchema, hp: z.number().int().min(0).max(100), maxHp: stat, attack: stat, defense: stat, speed: stat}),
  abilities: z.object({normalAttack: abilitySchema, specialAttack: abilitySchema, passive: abilitySchema.optional()}),
  trait: signatureTraitSchema.optional(), jargon: z.enum(['TAKE_OFFLINE', 'CIRCLE_BACK', 'PER_MY_LAST_EMAIL', 'ON_MUTE', 'QUICK_SYNC']).optional(),
  lore: loreSchema.optional(), loreSource: z.enum(['gemini', 'fallback']).optional(), badges: z.array(shortText(60)).max(4).optional(), layaRead: layaReadSchema.optional(),
  personality: z.object({trashTalk: shortText(140).optional(), temperament: shortText(80).optional(), lines: battleLinesSchema.optional()}),
  context: z.object({environment: shortText(120).optional(), environmentalBuff: shortText(160).optional()}).optional(),
  metadata: z.object({createdAt: z.iso.datetime(), aiProvider: shortText(60), decisionProvider: z.enum(['laya', 'fallback'])}),
});

export const ObjectAnalysisSchema = objectAnalysisSchema;
export const ObjectRejectionSchema = objectRejectionSchema;
export const CharacterDecisionSchema = characterDecisionSchema;
export const GameCharacterSchema = gameCharacterSchema;
