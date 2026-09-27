import type { GameCharacter } from './game';
import type { ArenaId, ReinforcementItem } from '@/lib/game/arenas';
export type PlayerSlot = 'player1' | 'player2';
/** The four counter-triangle moves. */
export type CoreMove = 'strike' | 'guard' | 'break' | 'special';
/** Both players pick secretly each round; `snap` (once per match) spends the round grabbing a reinforcement. */
export type BattleMove = CoreMove | 'snap';
/** Short outcome tag for each fighter this round, used by the reveal UI. */
export type ClashResult = 'hit' | 'blocked' | 'countered' | 'interrupted' | 'broken' | 'clash' | 'focus' | 'snapping';
export interface RoundEvent {
 round: number;
 moves: Record<PlayerSlot, BattleMove>;
 /** Damage each fighter TOOK this round (including burn). */
 damageTaken: Record<PlayerSlot, number>;
 result: Record<PlayerSlot, ClashResult>;
 energyAfter: Record<PlayerSlot, number>;
 superEffective: Record<PlayerSlot, boolean>;
 /** Call It: the guess each player made this round (if any) and whether it was right. */
 calls: Partial<Record<PlayerSlot, { guess: BattleMove; correct: boolean }>>;
 /** Trait names that changed this round's outcome, for the reveal UI. */
 traitsTriggered: Partial<Record<PlayerSlot, string>>;
 message: string;
}
/** Out-of-round commentary, e.g. a reinforcement arriving. `afterRound` orders it within the log. */
export interface BattleNote { afterRound: number; message: string; slot?: PlayerSlot }
export interface BattleStatus {
 /** Remaining incoming hits halved by a Shield item. */
 shield: number;
 /** A Trap item waiting to spring on the rival's next hit. */
 trap: boolean;
 /** Scald burn rounds left. */
 burn: number;
 /** Rounds this fighter loses the speed tiebreak (Snare). */
 snared: number;
}
export interface BattleState {
 player1: GameCharacter; player2: GameCharacter; player1Hp: number; player2Hp: number;
 status: 'battle' | 'finished'; winnerId?: string; log: RoundEvent[]; notes: BattleNote[];
 energy: Record<PlayerSlot, number>; round: number; seed: number;
 callUsed: Record<PlayerSlot, boolean>;
 snapUsed: Record<PlayerSlot, boolean>;
 /** Players who snapped and still have to take (or forfeit) their reinforcement photo. */
 pendingSnaps: PlayerSlot[];
 effects: Record<PlayerSlot, BattleStatus>;
 arena?: ArenaId;
}
export type { ReinforcementItem };
