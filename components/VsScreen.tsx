import { Swords, ArrowRight, Camera, LoaderCircle, MapPin, Bot } from 'lucide-react';
import type { GameCharacter } from '@/types/game';
import { ARENAS, type ArenaId } from '@/lib/game/arenas';
import { CharacterCard } from './CharacterCard';
import { GameBriefing } from './GameBriefing';

interface VsProps {
  fighters: GameCharacter[];
  onStart: () => void;
  arena?: ArenaId | null;
  arenaBusy?: boolean;
  arenaError?: string;
  onArenaPhoto?: (file: File) => void;
  /** Solo mode: Player 2 is played by the Laya bot. */
  solo?: boolean;
  onToggleSolo?: () => void;
}

export function VsScreen({ fighters, onStart, arena, arenaBusy = false, arenaError, onArenaPhoto, solo = false, onToggleSolo }: VsProps) {
  return <section className="matchup-screen"><p className="eyebrow"><Swords size={16}/>THE MOST UNNECESSARY FIGHT OF THE DAY</p><h1 className="screen-title">ORDINARY OBJECTS.<br/><span className="purple-text">EXTRAORDINARY BEEF.</span></h1><div className="vs-lineup"><CharacterCard character={fighters[0]} player={1} showTrait/><div className="versus">VS<span>NO HARD FEELINGS.<br/>PROBABLY.</span></div><CharacterCard character={fighters[1]} player={2} showTrait/></div>
    <GameBriefing fighters={fighters}/>
    <button className="button primary" onClick={onStart}>Enter the arena<ArrowRight size={20}/></button>
    {onArenaPhoto && <div className="arena-snap">
      {arena
        ? <p className="arena-result"><MapPin size={14}/><b>ARENA: {ARENAS[arena].name.toUpperCase()}</b> · {ARENAS[arena].blurb}</p>
        : <p className="arena-hint">Optional: snap your surroundings to pick the arena. One element gets +10% damage.</p>}
      <label className={`text-button arena-button ${arenaBusy ? 'is-busy' : ''}`}>
        {arenaBusy ? <LoaderCircle size={14} className="spin"/> : <Camera size={14}/>}{arenaBusy ? 'Reading the room…' : arena ? 'Re-snap the arena' : 'Snap the arena'}
        <input className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" aria-label="Snap the arena" disabled={arenaBusy} onChange={e => { const file = e.target.files?.[0]; if (file) onArenaPhoto(file); e.target.value = ''; }}/>
      </label>
      {arenaError && <p className="arena-error" role="status">{arenaError}</p>}
    </div>}
    {onToggleSolo && <div className="solo-toggle">
      <button className={`text-button ${solo ? 'is-on' : ''}`} aria-pressed={solo} onClick={onToggleSolo}><Bot size={14}/>{solo ? 'Solo: Laya plays Player 2' : 'No Player 2? Play solo vs Laya'}</button>
      {solo && <p className="arena-hint">Laya studies your habits and predicts your next move. Stay unpredictable.</p>}
    </div>}
    <p className="fine-print">Pass the device. Take turns. Settle absolutely nothing.</p></section>;
}
