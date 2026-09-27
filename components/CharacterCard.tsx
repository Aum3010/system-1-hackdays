import { ArrowUpRight, Sparkles, Zap, Droplets, Flame, Leaf, Shield, Shuffle } from 'lucide-react';
import type { GameCharacter, ElementType } from '@/types/game';
import { TRAITS } from '@/lib/game/traits';

const elementIcons = { electric: Zap, water: Droplets, heat: Flame, nature: Leaf, metal: Shield, chaos: Shuffle };
export function TypeBadge({ type }: { type: ElementType }) {
  const Icon = elementIcons[type];
  return <span className={`type-badge type-${type}`}><Icon size={12} strokeWidth={2.5}/>{type}</span>;
}
export function CharacterCard({ character, player, compact = false, featured = false, showTrait = false }: { character: GameCharacter; player?: number; compact?: boolean; featured?: boolean; showTrait?: boolean }) {
  return <article className={`fighter-card element-${character.type.primary} ${compact ? 'compact' : ''} ${featured ? 'featured' : ''}`}>
    <div className="fighter-card-top"><span>{player ? `PLAYER 0${player}` : 'EVERYDAY LEGEND'}</span><span><Sparkles size={12}/>{character.identity.rarity}</span></div>
    <div className="fighter-photo"><img src={character.sourceImage} alt={character.object.name} draggable={false}/><span className="object-label">{character.object.name}<ArrowUpRight size={13}/></span></div>
    <div className="fighter-card-bottom"><div className="type-badges"><TypeBadge type={character.type.primary}/>{character.type.secondary && <TypeBadge type={character.type.secondary}/>}{showTrait && character.trait && <span className="type-badge trait-badge" title={TRAITS[character.trait].rule}>★ {TRAITS[character.trait].name}</span>}{showTrait && character.badges?.map(badge => <span key={badge} className="type-badge hunt-badge">{badge}</span>)}</div><h3>{character.identity.name}</h3><p><Zap size={13}/>{character.abilities.specialAttack.name}</p></div>
  </article>;
}
