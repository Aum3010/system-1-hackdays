import { Trophy, RotateCcw, Camera, ArrowRight } from 'lucide-react';
import type { BattleState } from '@/types/battle';
import { CharacterCard } from './CharacterCard';
import { Confetti } from './fx/Confetti';

export function WinnerScreen({ battle, onRematch, onReset }: { battle: BattleState; onRematch: () => void; onReset: () => void }) {
  const winner = battle.player1.id === battle.winnerId ? battle.player1 : battle.player2;
  const player = winner.id === battle.player1.id ? 1 : 2;
  return <section className="winner-screen"><div className="winner-copy"><p className="eyebrow"><Trophy size={17}/>PLAYER 0{player} TAKES THE CROWN</p><h1 className="winner-title">HOUSEHOLD<br/><span>HERO.</span></h1><h2>{winner.identity.name} WINS!</h2><p>From minding its own business to absolutely making it everyone’s problem.</p><div className="match-result"><span><strong>{battle.round}</strong>ROUNDS</span><span><strong>01</strong>NEW LEGEND</span><span><strong>∞</strong>BRAGGING RIGHTS</span></div><div className="winner-buttons"><button className="button primary" onClick={onRematch}><RotateCcw size={18}/>Rematch<ArrowRight size={18}/></button><button className="button secondary" onClick={onReset}><Camera size={18}/>Scan new objects</button></div></div><div className="winner-card"><div className="winner-burst" aria-hidden="true"/><span className="winner-trophy"><Trophy size={35}/></span><CharacterCard character={winner} player={player} featured/><span className="sticker winner-sticker">CERTIFIED MENACE</span></div><Confetti key={battle.seed} type={winner.type.primary}/></section>;
}
