import type { ObjectAnalysis } from '@/types/object';
import type { CharacterRarity } from '@/types/game';

/** Cosmetic only. Rarity is never read by stat generation or damage calculation. */
export function getRarity(analysis: ObjectAnalysis): CharacterRarity {
  const object = `${analysis.objectName} ${analysis.category}`.toLowerCase();
  if (/rubber duck|disco|novelty|taxidermy|kazoo/.test(object)) return 'absurd';
  if (/microscope|telescope|antique|sculpture|instrument/.test(object)) return 'epic';
  if (analysis.materials.length >= 4 || /extinguisher|umbrella|calculator/.test(object)) return 'rare';
  if (analysis.materials.length >= 2) return 'uncommon';
  return 'common';
}
