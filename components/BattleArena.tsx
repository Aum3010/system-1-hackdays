'use client';

import { useEffect, useRef, useState } from 'react';
import { Swords, Shield, Zap, Hammer, CircleDot, Lock, Keyboard, Smartphone, EyeOff, ArrowRight, Megaphone, Camera, Bot } from 'lucide-react';
import type { BattleState, BattleMove, CoreMove, PlayerSlot } from '@/types/battle';
import type { FxEvent } from '@/lib/fx/timeline';
import { MAX_ENERGY, MAX_ROUNDS, canCall, canUse, specialCost } from '@/lib/game/battleEngine';
import { ARENAS } from '@/lib/game/arenas';
import { useBattleTimeline, type TimelineView } from '@/hooks/useBattleTimeline';
import { CharacterCard } from './CharacterCard';
import { HealthBar } from './HealthBar';
import { FxCenter, MoveCard, DamageNumber, LineBubble, TraitTag } from './fx/BattleFx';
import { VsIntro } from './fx/VsIntro';

type InputMode = 'keys' | 'pass';
type PassStage = 'cover1' | 'pick1' | 'cover2' | 'pick2';
type Pick = { move: BattleMove; guess?: BattleMove };
export type Calls = Partial<Record<PlayerSlot, BattleMove>>;
/** Solo mode: returns Player 2's pick for the current round, computed before Player 1 picks. */
export type BotPlayer = (state: BattleState) => Promise<{ move: BattleMove; source: 'laya' | 'builtin' }>;

const SLOTS: PlayerSlot[] = ['player1', 'player2'];
const MOVES: { move: CoreMove; label: string; hint: string; Icon: typeof Swords }[] = [
  { move: 'strike', label: 'STRIKE', hint: 'Beats Break', Icon: Swords },
  { move: 'guard', label: 'GUARD', hint: 'Blocks Strike & Special', Icon: Shield },
  { move: 'break', label: 'BREAK', hint: 'Smashes Guard', Icon: Hammer },
  { move: 'special', label: 'SPECIAL', hint: '3 energy', Icon: Zap },
];
const GUESSES: BattleMove[] = ['strike', 'guard', 'break', 'special', 'snap'];
const KEYS: Record<PlayerSlot, string[]> = { player1: ['A', 'S', 'D', 'F', 'G'], player2: ['J', 'K', 'L', ';', 'H'] };
const CALL_KEY: Record<PlayerSlot, string> = { player1: 'Q', player2: 'P' };
const KEY_CODES: Record<string, [PlayerSlot, number]> = {
  KeyA: ['player1', 0], KeyS: ['player1', 1], KeyD: ['player1', 2], KeyF: ['player1', 3], KeyG: ['player1', 4],
  KeyJ: ['player2', 0], KeyK: ['player2', 1], KeyL: ['player2', 2], Semicolon: ['player2', 3], KeyH: ['player2', 4],
};
const MOVE_LABEL: Record<BattleMove, string> = { strike: 'STRIKE', guard: 'GUARD', break: 'BREAK', special: 'SPECIAL', snap: 'SNAP' };
const playerNo = (slot: PlayerSlot) => slot === 'player1' ? 1 : 2;

interface ArenaProps {
  battle: BattleState;
  /** State before the latest round; drives the reveal animation. Null right after a (re)start. */
  prev: BattleState | null;
  onRound: (move1: BattleMove, move2: BattleMove, calls: Calls) => void;
  busy: boolean;
  instant: boolean;
  onTimelineDone: () => void;
  onFx?: (event: FxEvent) => void;
  /** Reinforcement analysis in flight, per player. */
  snapping?: Partial<Record<PlayerSlot, boolean>>;
  /** When set, Player 2 is the Laya bot. */
  bot?: BotPlayer;
}

export function BattleArena({ battle, prev, onRound, busy, instant, onTimelineDone, onFx, snapping = {}, bot }: ArenaProps) {
  // Touch devices can't hide simultaneous taps, so they default to pass-the-phone.
  const [preferredMode, setMode] = useState<InputMode>(() => typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches ? 'pass' : 'keys');
  const [picks, setPicks] = useState<Partial<Record<PlayerSlot, Pick>>>({});
  const [calling, setCalling] = useState<Partial<Record<PlayerSlot, boolean>>>({});
  const [guessing, setGuessing] = useState<Partial<Record<PlayerSlot, BattleMove>>>({});
  const [stage, setStage] = useState<PassStage>('cover1');
  const fx = useBattleTimeline(prev, battle, instant, onFx, onTimelineDone);
  // Solo mode has nothing to hide from a bot, so it always uses the on-screen pad.
  const mode: InputMode = bot ? 'keys' : preferredMode;
  const [botPick, setBotPick] = useState<{ key: string; move: BattleMove; source: 'laya' | 'builtin' } | null>(null);
  const botSent = useRef('');
  const roundKey = `${battle.player1.id}-${battle.player2.id}-${battle.seed}-${battle.round}`;

  // Every resolved round (or rematch) starts a fresh blind pick.
  useEffect(() => { setPicks({}); setCalling({}); setGuessing({}); setStage('cover1'); }, [battle.round, battle.player1.id, battle.player2.id]);

  // The bot commits at the start of the round, from the state before Player 1 picks: blind, like a human.
  const botRef = useRef(bot); botRef.current = bot;
  const battleNow = useRef(battle); battleNow.current = battle;
  const solo = !!bot;
  useEffect(() => {
    const player = botRef.current;
    if (!player || battleNow.current.status === 'finished') return;
    let live = true;
    setBotPick(null);
    void player(battleNow.current).then(result => { if (live) setBotPick({ key: roundKey, ...result }); });
    return () => { live = false; };
  }, [solo, roundKey]);

  const locked = busy || fx.playing || battle.status === 'finished';

  useEffect(() => {
    const mine = picks.player1;
    if (!bot || !mine || botPick?.key !== roundKey || locked || botSent.current === roundKey) return;
    botSent.current = roundKey;
    onRound(mine.move, botPick.move, mine.guess ? { player1: mine.guess } : {});
  }, [bot, picks.player1, botPick, roundKey, locked, onRound]);

  function commit(slot: PlayerSlot, pick: Pick) {
    const next = { ...picks, [slot]: pick };
    setPicks(next);
    setGuessing(g => ({ ...g, [slot]: undefined }));
    if (mode === 'pass') setStage(slot === 'player1' ? 'cover2' : 'cover1');
    if (next.player1 && next.player2) {
      const calls: Calls = {};
      for (const s of SLOTS) { const guess = next[s]?.guess; if (guess) calls[s] = guess; }
      onRound(next.player1.move, next.player2.move, calls);
    }
  }

  function choose(slot: PlayerSlot, move: BattleMove) {
    if (locked || picks[slot]) return;
    const awaiting = guessing[slot];
    if (awaiting) { commit(slot, { move: awaiting, guess: move }); return; }
    if (!canUse(battle, slot, move)) return;
    if (calling[slot] && canCall(battle, slot)) { setGuessing(g => ({ ...g, [slot]: move })); return; }
    commit(slot, { move });
  }

  function toggleCall(slot: PlayerSlot) {
    if (locked || picks[slot] || guessing[slot] || !canCall(battle, slot)) return;
    setCalling(c => ({ ...c, [slot]: !c[slot] }));
  }

  useEffect(() => {
    if (mode !== 'keys') return;
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.code === 'KeyQ' || event.code === 'KeyP') { event.preventDefault(); toggleCall(event.code === 'KeyQ' ? 'player1' : 'player2'); return; }
      const binding = KEY_CODES[event.code];
      if (!binding) return;
      event.preventDefault();
      const [slot, index] = binding;
      if (bot && slot === 'player2') return;
      choose(slot, guessing[slot] ? GUESSES[index] : index === 4 ? 'snap' : MOVES[index].move);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function switchMode() { setMode(mode === 'keys' ? 'pass' : 'keys'); setPicks({}); setCalling({}); setGuessing({}); setStage('cover1'); }

  // Hold back the newest round's text until the reveal lands.
  const log = fx.revealed ? battle.log : battle.log.slice(0, -1);
  const last = log.at(-1);
  const hpShown = (slot: PlayerSlot) => fx.playing ? fx.hp[slot] : slot === 'player1' ? battle.player1Hp : battle.player2Hp;
  const energyShown = (slot: PlayerSlot) => fx.playing ? fx.energy[slot] : battle.energy[slot];
  const threat = SLOTS.filter(slot => energyShown(slot) >= specialCost(battle[slot]));
  const newest = battle.log.at(-1);
  const showMoveCards = !!newest && !picks.player1 && !picks.player2 && (fx.playing || fx.callouts.length > 0);
  const notes = battle.notes.filter(n => n.afterRound <= battle.round);

  return <section className="battle-screen">
    {battle.round === 0 && <VsIntro fighters={[battle.player1, battle.player2]} matchKey={`${battle.player1.id}-${battle.player2.id}-${battle.seed}`} instant={instant}/>}
    <div className="battle-heading">
      <div><p className="eyebrow"><CircleDot size={14}/>{bot ? 'SOLO VS LAYA · BLIND PICKS' : 'LOCAL MULTIPLAYER · BLIND PICKS'}</p><h1 className="screen-title">OUTGUESS. <span className="purple-text">OUTLAST.</span></h1></div>
      <span className="round-badge">ROUND<strong>{Math.min(battle.round + (fx.playing ? 0 : 1), MAX_ROUNDS)}</strong><small>OF {MAX_ROUNDS}</small></span>
    </div>
    {battle.arena && <p className="arena-chip">ARENA · {ARENAS[battle.arena].name.toUpperCase()} · {ARENAS[battle.arena].blurb}</p>}

    <div className={`battle-field ${fx.playing ? 'fx-busy' : ''} ${fx.hitstop ? 'fx-hitstop' : ''} ${shakeClass(fx)}`}>
      {SLOTS.map(slot => {
        const hit = fx.hits[slot];
        return <div key={slot} className={`battle-fighter ${fx.ko === slot ? 'fx-ko' : ''}`}>
          <div className="fighter-turn-label"><span>{bot && slot === 'player2' ? 'LAYA BOT' : `PLAYER 0${playerNo(slot)}`}</span>{picks[slot] || (bot && slot === 'player2' && botPick?.key === roundKey && !locked) ? <strong><Lock size={12}/>LOCKED IN</strong> : locked ? <span>REVEAL</span> : <span>CHOOSING…</span>}</div>
          <div className="fighter-card-wrap">
            <div key={hit ? `card-${hit.key}` : 'still'} className={hit ? 'took-hit' : ''}><CharacterCard character={battle[slot]} compact showTrait/></div>
            {hit && <DamageNumber key={`dmg-${hit.key}`} amount={hit.amount} heavy={hit.heavy}/>}
            {showMoveCards && newest && <MoveCard move={newest.moves[slot]} revealed={fx.revealed} called={!!newest.calls[slot]}/>}
            {fx.traits[slot] && <TraitTag key={`${battle.round}-${slot}`} name={fx.traits[slot]!}/>}
            {fx.line?.slot === slot && <LineBubble key={fx.line.key} text={fx.line.text}/>}
            {fx.ko === slot && <span className="fx-crack" aria-hidden="true"/>}
          </div>
          <HealthBar name={battle[slot].identity.name} hp={hpShown(slot)} maxHp={battle[slot].combat.maxHp}/>
          <EnergyMeter name={battle[slot].identity.name} value={energyShown(slot)} cost={specialCost(battle[slot])}/>
          {snapping[slot] && <p className="snap-pending"><Camera size={11}/>Reinforcement incoming…</p>}
        </div>;
      })}
      <div className="battle-vs">VS</div>
      <FxCenter countdown={fx.countdown} callouts={fx.callouts}/>
      {fx.announce && <p key={fx.announce.key} className="fx-announce" role="status"><b>ANNOUNCER</b> {fx.announce.text}</p>}
    </div>

    {last && <div className={`clash-banner ${fx.playing ? 'is-fresh' : ''}`} aria-live="polite">
      <span className={`clash-move move-${last.moves.player1}`}>P1 · {MOVE_LABEL[last.moves.player1]}</span>
      <strong>VS</strong>
      <span className={`clash-move move-${last.moves.player2}`}>{MOVE_LABEL[last.moves.player2]} · P2</span>
      <p>{last.message}</p>
    </div>}

    <div className="battle-bottom">
      <div className="action-panel">
        <div className="action-heading">
          <span className="turn-dot"/>
          <p><strong>{battle.status === 'finished' ? 'Match over!' : locked ? 'Clash!' : bot ? 'Pick your move. Laya has already read you.' : 'Both players: pick in secret.'}</strong>
            <span>{threat.length ? `${threat.map(s => `P${playerNo(s)}`).join(' & ')} can afford a Special. Guard might be wise…` : 'Strike › Break › Guard › Strike. Special beats Strike & Break, loses to Guard.'}</span></p>
          {!bot && <button className="text-button mode-toggle" onClick={switchMode}>{mode === 'keys' ? <><Smartphone size={14}/>Pass-the-phone</> : <><Keyboard size={14}/>Keyboard mode</>}</button>}
        </div>
        {mode === 'keys'
          ? <div className="pick-columns">{SLOTS.map(slot => bot && slot === 'player2' ? <BotPad key={slot} ready={botPick?.key === roundKey} source={botPick?.source} locked={locked}/> : <PickPad key={slot} slot={slot} battle={battle} pick={picks[slot]} disabled={locked} onChoose={choose} showKeys calling={!!calling[slot]} guessing={guessing[slot]} onToggleCall={toggleCall}/>)}</div>
          : <PassPanel stage={stage} setStage={setStage} battle={battle} picks={picks} busy={locked} onChoose={choose} calling={calling} guessing={guessing} onToggleCall={toggleCall}/>}
      </div>
      <div className="battle-log">
        <div className="mono">ARENA COMMENTARY<span className="live-dot"/></div>
        <div className="log-entries" role="log" aria-live="polite" aria-relevant="additions text">
          {log.length || notes.length ? commentary(log, notes).slice(-4).map(entry => <p key={entry.key} className={entry.effective ? 'effective' : ''}>{entry.round !== undefined && <b>R{entry.round}</b>} {entry.message}</p>) : <p>The crowd goes mild. Two objects enter. One leaves with bragging rights.</p>}
        </div>
      </div>
    </div>
  </section>;
}

function shakeClass(fx: TimelineView) {
  const top = fx.callouts.at(-1);
  return top && fx.playing && (top.tone === 'counter' || top.tone === 'break') ? `fx-shake-${top.key % 2}` : '';
}

function commentary(log: BattleState['log'], notes: BattleState['notes']) {
  const rows: { key: string; round?: number; message: string; effective: boolean; order: number }[] = log.map(e => ({ key: `r${e.round}`, round: e.round, message: e.message, effective: Object.values(e.superEffective).some(Boolean), order: e.round }));
  notes.forEach((n, i) => rows.push({ key: `n${i}`, message: n.message, effective: false, order: n.afterRound + .5 }));
  return rows.sort((a, b) => a.order - b.order);
}

function EnergyMeter({ name, value, cost }: { name: string; value: number; cost: number }) {
  const [previous, setPrevious] = useState(value);
  const [changed, setChanged] = useState<{ from: number; to: number } | null>(null);
  useEffect(() => {
    if (value === previous) return;
    setChanged({ from: previous, to: value });
    setPrevious(value);
    const timer = setTimeout(() => setChanged(null), 600);
    return () => clearTimeout(timer);
  }, [value, previous]);
  const pipClass = (i: number) => {
    const filled = i < value;
    if (changed && filled && i >= changed.from) return 'filled pip-gain';
    if (changed && !filled && i < changed.from) return 'pip-spend';
    return filled ? 'filled' : '';
  };
  return <div className="energy">
    <div className="energy-label"><span>ENERGY</span>{value >= cost ? <strong className="special-ready"><Zap size={11}/>SPECIAL READY</strong> : <small>{cost - value} to special</small>}</div>
    <div className={`energy-pips ${value >= cost ? 'pip-threat' : ''}`} role="meter" aria-label={`${name} energy`} aria-valuemin={0} aria-valuemax={MAX_ENERGY} aria-valuenow={value}>
      {Array.from({ length: MAX_ENERGY }, (_, i) => <span key={i} className={pipClass(i)}/>)}
    </div>
  </div>;
}

interface PadProps {
  slot: PlayerSlot; battle: BattleState; pick?: Pick; disabled: boolean; showKeys?: boolean;
  calling: boolean; guessing?: BattleMove; onChoose: (slot: PlayerSlot, move: BattleMove) => void; onToggleCall: (slot: PlayerSlot) => void;
}

function PickPad({ slot, battle, pick, disabled, onChoose, showKeys, calling, guessing, onToggleCall }: PadProps) {
  const n = playerNo(slot);
  const rival = n === 1 ? 2 : 1;
  if (pick) return <div className="pick-pad is-locked"><p className="mono">PLAYER 0{n}</p><div className="locked-card"><EyeOff size={22}/><strong>LOCKED IN</strong><span>Hidden until both players pick</span></div></div>;
  if (guessing) return <div className="pick-pad">
    <p className="mono">PLAYER 0{n} · CALL IT: WHAT WILL PLAYER {rival} PICK?</p>
    <div className="call-grid">
      {GUESSES.map((move, i) => <button key={move} className={`call-button move-${move}`} aria-label={`Player ${n} guesses ${MOVE_LABEL[move]}`} disabled={disabled} onClick={() => onChoose(slot, move)}>{MOVE_LABEL[move]}{showKeys && <kbd>{KEYS[slot][i]}</kbd>}</button>)}
    </div>
    <p className="call-hint">You picked {MOVE_LABEL[guessing]}. Right guess: your hit ×1.5. Wrong: you take +25%.</p>
  </div>;
  const cost = specialCost(battle[slot]);
  const canSnap = canUse(battle, slot, 'snap');
  return <div className="pick-pad">
    <p className="mono">PLAYER 0{n}{showKeys && <span> · KEYS {KEYS[slot].slice(0, 4).join(' ')}</span>}</p>
    <div className="ability-buttons">
      {MOVES.map(({ move, label, hint, Icon }, i) => {
        const affordable = canUse(battle, slot, move);
        return <button key={move} className={`ability-button ${move}`} aria-label={`Player ${n} ${label}`} disabled={disabled || !affordable} onClick={() => onChoose(slot, move)}>
          <Icon size={20}/><strong>{label}</strong><span>{move === 'special' ? (affordable ? `${cost} energy` : `Need ${cost} energy`) : hint}</span>{showKeys && <kbd>{KEYS[slot][i]}</kbd>}
        </button>;
      })}
    </div>
    <div className="pick-extras">
      <button className={`extra-button ${calling ? 'is-armed' : ''}`} aria-pressed={calling} aria-label={`Player ${n} Call It`} disabled={disabled || !canCall(battle, slot)} onClick={() => onToggleCall(slot)}>
        <Megaphone size={13}/>{canCall(battle, slot) ? (calling ? 'CALL IT: ARMED' : 'CALL IT') : 'CALL USED'}{showKeys && <kbd>{CALL_KEY[slot]}</kbd>}
      </button>
      <button className="extra-button" aria-label={`Player ${n} Snap`} disabled={disabled || !canSnap} onClick={() => onChoose(slot, 'snap')}>
        <Camera size={13}/>{canSnap ? 'SNAP ITEM' : 'SNAP USED'}{showKeys && <kbd>{KEYS[slot][4]}</kbd>}
      </button>
    </div>
  </div>;
}

function BotPad({ ready, source, locked }: { ready: boolean; source?: 'laya' | 'builtin'; locked: boolean }) {
  return <div className="pick-pad is-locked bot-pad" aria-live="polite">
    <p className="mono">LAYA BOT</p>
    <div className="locked-card">
      <Bot size={22}/>
      <strong>{locked ? 'REVEAL' : ready ? 'LOCKED IN' : 'READING YOU…'}</strong>
      <span>{ready && source === 'builtin' ? 'Laya is offline: the built-in bot picked.' : 'Laya predicts your move from your habits, then counters. Mix it up.'}</span>
    </div>
  </div>;
}

function PassPanel({ stage, setStage, battle, picks, busy, onChoose, calling, guessing, onToggleCall }: { stage: PassStage; setStage: (stage: PassStage) => void; battle: BattleState; picks: Partial<Record<PlayerSlot, Pick>>; busy: boolean; onChoose: (slot: PlayerSlot, move: BattleMove) => void; calling: Partial<Record<PlayerSlot, boolean>>; guessing: Partial<Record<PlayerSlot, BattleMove>>; onToggleCall: (slot: PlayerSlot) => void }) {
  if (busy) return <div className="pass-cover"><p>Revealing the clash…</p></div>;
  if (stage === 'pick1' || stage === 'pick2') {
    const slot: PlayerSlot = stage === 'pick1' ? 'player1' : 'player2';
    return <PickPad slot={slot} battle={battle} pick={picks[slot]} disabled={busy} onChoose={onChoose} calling={!!calling[slot]} guessing={guessing[slot]} onToggleCall={onToggleCall}/>;
  }
  const slot: PlayerSlot = stage === 'cover1' ? 'player1' : 'player2';
  const rival = slot === 'player1' ? 2 : 1;
  return <div className="pass-cover">
    <EyeOff size={26}/>
    <p><strong>Hand the device to Player {playerNo(slot)}.</strong>Player {rival}, no peeking.{picks.player1 && slot === 'player2' ? ' Player 1 has locked in.' : ''}</p>
    <button className="button primary" onClick={() => setStage(stage === 'cover1' ? 'pick1' : 'pick2')}>I&apos;m Player {playerNo(slot)}, show my moves<ArrowRight size={16}/></button>
  </div>;
}
