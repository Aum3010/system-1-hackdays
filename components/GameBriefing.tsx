import { Swords, Shield, Hammer, Zap, Megaphone, Camera, Star } from 'lucide-react';
import type { GameCharacter } from '@/types/game';
import { TRAITS } from '@/lib/game/traits';
import { MAX_ROUNDS } from '@/lib/game/battleEngine';

/** Pre-fight "how to play" card shown on the VS screen, tailored to the two fighters. */
export function GameBriefing({ fighters }: { fighters: GameCharacter[] }) {
  return <section className="briefing" aria-labelledby="briefing-title">
    <h2 id="briefing-title">HOW TO WIN THIS FIGHT</h2>
    <ol className="briefing-steps">
      <li><strong>Pick in secret, every round.</strong>Both players lock a move at the same time: keys <kbd>A S D F</kbd> vs <kbd>J K L ;</kbd>, or pass the phone.</li>
      <li><strong>Outguess, don’t spam.</strong>
        <span className="briefing-triangle">
          <span><Swords size={13}/>Strike beats Break</span>
          <span><Hammer size={13}/>Break smashes Guard</span>
          <span><Shield size={13}/>Guard counters Strike</span>
          <span><Zap size={13}/>Special (3 energy) beats Strike &amp; Break, loses to Guard</span>
        </span>
      </li>
      <li><strong>Watch the energy bars.</strong>+1 each round, +1 for guarding. A full-enough bar means a Special might be coming.</li>
      <li><strong>Once per match each:</strong>
        <span className="briefing-extras">
          <span><Megaphone size={13}/><b>Call It</b> (<kbd>Q</kbd>/<kbd>P</kbd>): guess the rival’s move. Right: ×1.5 hit. Wrong: +25% taken.</span>
          <span><Camera size={13}/><b>Snap</b> (<kbd>G</kbd>/<kbd>H</kbd>): skip a move, then you have 15s to photograph an item: Heal, Shield, Energy or Trap.</span>
        </span>
      </li>
    </ol>
    <div className="briefing-traits">
      {fighters.map((fighter, i) => fighter.trait && <p key={fighter.id}><Star size={13}/><b>P{i + 1} {fighter.identity.name} · {TRAITS[fighter.trait].name}:</b> {TRAITS[fighter.trait].rule}</p>)}
    </div>
    <p className="briefing-foot">Knock them to 0 HP, or be healthier after {MAX_ROUNDS} rounds.</p>
  </section>;
}
