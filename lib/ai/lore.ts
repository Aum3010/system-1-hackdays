import type { ObjectAnalysis } from '../../types/object';
import { loreSchema, type LorePack } from '../validation/lore';
import { generateStructured, type FlavorSource, type Transport } from './structured';
import { avoidNote, ownerNote, systemFor, type OwnerInfo, type Spice } from './persona';
import { fallbackLore } from './fallbackLore';
import { identityRules } from '../game/identity';
import { layaSafetyFlag } from './layaSafety';

/**
 * The Laya safety pass reads only the people-facing fields. The announcer bank is formulaic
 * cartoon-fight narration: in tests it only diluted real hits and caused violence false positives.
 */
export const loreSafetyFields = (lore: LorePack) => ({
  title: lore.corporateTitle, headline: lore.linkedInHeadline, tenure: lore.yearsAtCompany, origin: lore.originQuestion,
  standup: lore.standupUpdate, special: lore.jargonSpecial, trashTalk: lore.trashTalk,
});
import { getRarity } from '../game/rarity';
import { TRAITS } from '../game/traits';
import { JARGON } from '../game/jargon';

export const LORE_TIMEOUT_MS = 8_000;
export interface LoreInput { analysis: ObjectAnalysis; spice: Spice; owner?: OwnerInfo; avoid?: string[] }

/** Call 1: Lore Pack (per fighter, at capture). Flavor only; the jargon rule is decided in code. */
export async function generateLore(input: LoreInput, transport?: Transport | null): Promise<{ lore: LorePack; source: FlavorSource; jargon: string }> {
  const { analysis } = input;
  const [{ trait, jargon }, nameFlag] = await Promise.all([identityRules(analysis), input.owner?.name ? layaSafetyFlag(input.owner.name) : null]);
  // An owner "name" that Laya flags (an insult, profanity) is dropped rather than echoed into lore.
  if (nameFlag && input.owner) input = { ...input, owner: { ...input.owner, name: undefined } };
  const p = analysis.properties;
  const prompt = [
    `Write a Lore Pack for this fighter.`,
    `Object: ${analysis.objectName} (category: ${analysis.category}). Materials: ${analysis.materials.join(', ')}.`,
    `Physical properties: durability ${p.durability}, weight ${p.weight}, sharpness ${p.sharpness}, fragility ${p.fragility}, flexibility ${p.flexibility}, mobility ${p.mobility}, electronic ${p.electronic}.`,
    analysis.environment ? `Photographed in/on: ${analysis.environment}.` : '',
    `Fighter name: ${analysis.creative.suggestedCharacterName}. Rarity (cosmetic): ${getRarity(analysis)}. Signature trait: ${TRAITS[trait].name} (${TRAITS[trait].rule}).`,
    `Its Special carries the fixed rule ${jargon}: "${JARGON[jargon].rule}". Name the special for exactly that effect (you may rename, e.g. "Per My Last Memo"); never describe a different effect.`,
    `announcerBank: 2-3 lines per event, narrator voice, using ONLY the placeholders {self}, {opponent}, {move}; no other names.`,
    `{self} is ALWAYS this fighter and it is always THIS fighter's moment: it countered, it broke the rival's guard, it used its special, it landed the big hit, it came back, it won. {opponent} is the rival on the receiving end. {move} is the move {self} just used.`,
    `Keep violence cartoonish: no injury or medical words (trauma, blood, bruise, wound, hospital).`,
    `trashTalk: exactly 3 pre-battle lines that reference this object's physical properties or materials.`,
    ownerNote(input.owner),
    avoidNote(input.avoid ?? []),
  ].filter(Boolean).join('\n');
  const result = await generateStructured({
    label: 'lore', schema: loreSchema, system: systemFor(input.spice), prompt, timeoutMs: LORE_TIMEOUT_MS, maxTokens: 1800, transport,
    safetyCheck: data => layaSafetyFlag(loreSafetyFields(data as LorePack)),
    fallback: () => fallbackLore({ objectName: analysis.objectName, materials: analysis.materials, electronic: p.electronic, jargon, ownerName: input.owner?.name }),
  });
  return { lore: result.data, source: result.source, jargon };
}
