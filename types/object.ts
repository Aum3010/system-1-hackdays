/** Moments in a fight where a fighter can deliver a pre-generated one-liner (no AI calls during combat). */
export type BattleLineEvent = 'opener' | 'counter' | 'guardBreak' | 'special' | 'calledIt' | 'comeback' | 'knockout' | 'ouch';
export type TraitLevel = 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
export interface ObjectAnalysis {
  objectName: string; category: string; confidence: number; materials: string[];
  properties: {durability: TraitLevel; mobility: TraitLevel; weight: TraitLevel; sharpness: TraitLevel; fragility: TraitLevel; flexibility: TraitLevel; electronic: boolean};
  environment?: string; rejected?: boolean; rejectionReason?: string;
  creative: {suggestedCharacterName: string; suggestedDescription: string; suggestedSpecialAbility: string; suggestedPassiveAbility?: string; trashTalk?: string; battleLines?: Partial<Record<BattleLineEvent, string>>};
}
export interface ObjectRejection { rejected: true; rejectionReason: string }
