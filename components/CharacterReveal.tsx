import { ArrowRight, RotateCcw, Sparkles, Swords, Star, Timer } from 'lucide-react';
import { TRAITS } from '@/lib/game/traits';
import { HUNT_SECONDS, huntHint } from '@/lib/game/counterHunt';
import type { GameCharacter } from '@/types/game';
import { CharacterCard } from './CharacterCard';
import { StatBar } from './StatBar';
import { RevealCardFx } from './fx/RevealCardFx';
import { HrFile } from './HrFile';
import { LayaRead } from './LayaRead';

interface RevealExtras {
  /** Player 1 only: offer Player 2 a Counter-Hunt against this fighter. */
  hunt?: { enabled: boolean; onToggle: (enabled: boolean) => void };
  /** Player 2 only: Counter-Hunt result text. */
  huntSummary?: string | null;
  /** Lore Pack panel (origin answer is session-only). */
  origin?: { answer: string; onChange: (answer: string) => void };
}

export function CharacterReveal({ character, player, onContinue, onRescan, hunt, huntSummary, origin }: { character: GameCharacter; player: number; onContinue: () => void; onRescan: () => void } & RevealExtras) {
  return <section className="reveal-layout"><div className="reveal-card-wrap"><span className="sticker reveal-sticker">IT'S ALIVE-ISH!</span><RevealCardFx key={character.id} rarity={character.identity.rarity}><CharacterCard character={character} player={player} featured showTrait/></RevealCardFx></div><div className="reveal-details"><p className="eyebrow"><Sparkles size={15}/>PLAYER 0{player} · FIGHTER SUMMONED</p><h1 className="screen-title">MEET YOUR<br/><span className="purple-text">NEW MENACE.</span></h1><p className="reveal-description">{character.identity.description}</p><div className="class-line"><span className="mono">COMBAT CLASS</span><strong>{character.combat.class.replaceAll('_', ' ')}</strong></div><div className="stat-list"><StatBar label="HP" value={character.combat.maxHp}/><StatBar label="ATK" value={character.combat.attack}/><StatBar label="DEF" value={character.combat.defense}/><StatBar label="SPD" value={character.combat.speed}/></div><LayaRead character={character}/><div className="special-box"><Swords size={22}/><div><span className="mono">SIGNATURE MOVE</span><strong>{character.abilities.specialAttack.name}</strong><p>Costs 3 energy. Crushes Strike and Break, but a Guard shuts it down.</p></div></div>{character.trait && <div className="special-box trait-box"><Star size={22}/><div><span className="mono">SIGNATURE TRAIT</span><strong>{TRAITS[character.trait].name}</strong><p>{TRAITS[character.trait].rule}</p></div></div>}{origin && <HrFile character={character} originAnswer={origin.answer} onOriginAnswer={origin.onChange}/>}{huntSummary && <p className="hunt-result" role="status"><Timer size={14}/>{huntSummary}</p>}{hunt && <label className="hunt-toggle"><input type="checkbox" checked={hunt.enabled} onChange={e => hunt.onToggle(e.target.checked)}/><span><b>Counter-Hunt:</b> give Player 2 {HUNT_SECONDS}s to find a counter. {huntHint(character.type.primary)}</span></label>}{character.personality.trashTalk && <blockquote>“{character.personality.trashTalk}”</blockquote>}<button className="button primary wide" onClick={onContinue}>{player === 1 ? 'Add to battle · Find player 2' : 'Add to battle · Let’s fight'}<ArrowRight size={19}/></button><button className="text-button" onClick={onRescan}><RotateCcw size={14}/>Try another object</button></div></section>;
}
