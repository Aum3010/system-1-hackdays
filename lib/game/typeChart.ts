import type { ElementType } from '@/types/game';

export const TYPE_ADVANTAGES: Partial<Record<ElementType, ElementType>> = {
  water: 'heat', heat: 'nature', nature: 'electric', electric: 'water',
};
export function typeMultiplier(attack: ElementType, defender: ElementType): number {
  if (TYPE_ADVANTAGES[attack] === defender) return 1.3;
  if (TYPE_ADVANTAGES[defender] === attack) return .85;
  return defender === 'metal' && attack !== 'metal' ? .95 : 1;
}
