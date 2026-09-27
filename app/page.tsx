'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, Camera, Check, CircleDot, Flag, ScanLine, Shield, Sparkles, Swords, X, Zap } from 'lucide-react';
import type { GameCharacter } from '@/types/game';
import type { BattleMove, BattleState, PlayerSlot } from '@/types/battle';
import type { ArenaId, ReinforcementItem } from '@/lib/game/arenas';
import { applyHuntBonus, huntHint, HUNT_SECONDS } from '@/lib/game/counterHunt';
import { SnapModal } from '@/components/SnapModal';
import type { OwnerInfo } from '@/lib/ai/persona';
import { loreSchema } from '@/lib/validation/lore';
import type { FxEvent } from '@/lib/fx/timeline';
import { useFxSettings } from '@/hooks/useFxSettings';
import { FxControls } from '@/components/fx/FxControls';
import { playSfx, vibrate } from '@/lib/fx/sound';
import type { BotPlayer, Calls } from '@/components/BattleArena';
import { botMove, summarizeForBot } from '@/lib/game/bot';
import { seededRandom } from '@/lib/game/simulate';
import { compressImage } from '@/lib/image/compress';
import { applyReinforcement, createBattle, resolveRound } from '@/lib/game/battleEngine';
import { DEMO_FIGHTERS } from '@/lib/game/demo';
import { gameCharacterSchema } from '@/lib/validation/schemas';
import { CharacterCard } from '@/components/CharacterCard';
import { CameraUpload } from '@/components/CameraUpload';
import { LoadingSequence } from '@/components/LoadingSequence';
import { CharacterReveal } from '@/components/CharacterReveal';
import { VsScreen } from '@/components/VsScreen';
import { BattleArena } from '@/components/BattleArena';
import { WinnerScreen } from '@/components/WinnerScreen';

type Screen = 'landing' | 'capture' | 'reveal' | 'vs' | 'battle' | 'winner';
const STORAGE_KEY = 'object-arena-fighters-v1';

export default function Home() {
  const [screen, setScreen] = useState<Screen>('landing');
  const [fighters, setFighters] = useState<GameCharacter[]>([]);
  const [pending, setPending] = useState<GameCharacter | null>(null);
  const [battle, setBattle] = useState<BattleState | null>(null);
  const [prevBattle, setPrevBattle] = useState<BattleState | null>(null);
  const fxSettings = useFxSettings();
  const battleRef = useRef<BattleState | null>(null);
  battleRef.current = battle;
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const [rejected, setRejected] = useState(false);
  const [storageNotice, setStorageNotice] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  // Arena Snap (pre-fight), Snap Reinforcement (mid-fight) and Counter-Hunt state.
  const [arena, setArena] = useState<ArenaId | null>(null);
  const [arenaBusy, setArenaBusy] = useState(false);
  const [arenaError, setArenaError] = useState('');
  const [snapFor, setSnapFor] = useState<PlayerSlot | null>(null);
  const [snapping, setSnapping] = useState<Partial<Record<PlayerSlot, boolean>>>({});
  const [huntEnabled, setHuntEnabled] = useState(false);
  const [hunt, setHunt] = useState<{ target: GameCharacter; startedAt: number; stoppedAt: number | null } | null>(null);
  const [huntSummary, setHuntSummary] = useState<string | null>(null);
  const huntRef = useRef(hunt); huntRef.current = hunt;
  // Optional personalization: session memory only, never written to localStorage.
  const [owners, setOwners] = useState<Record<number, OwnerInfo>>({ 1: {}, 2: {} });
  // Solo mode: Player 2 is played by the Laya bot (prediction from Laya, counter-pick in lib/game/bot.ts).
  const [soloBot, setSoloBot] = useState(false);
  const [originAnswers, setOriginAnswers] = useState<Record<string, string>>({});
  const abortRef = useRef<AbortController | null>(null);
  const actionLock = useRef(false);
  const actionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if (Array.isArray(saved) && saved.length <= 2) {
        const valid = saved.map(item => gameCharacterSchema.safeParse(item));
        if (valid.every(result => result.success)) setFighters(valid.map(result => result.data as GameCharacter));
      }
    } catch { /* Saved fighters are optional. */ }
    setHydrated(true);
    return () => { abortRef.current?.abort(); if (actionTimer.current) clearTimeout(actionTimer.current); };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    // Owner names are session-only: scrub them from generated text before anything is saved.
    const names = Object.values(owners).map(o => o.name?.trim()).filter((n): n is string => !!n && n.length > 1);
    const saved = names.length ? scrubNames(fighters, names) : fighters;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(saved)); setStorageNotice(''); }
    catch { setStorageNotice('Your fighters are ready for this session. This browser couldn’t save them for later.'); }
  }, [fighters, hydrated, owners]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    mainRef.current?.focus({ preventScroll: true });
  }, [screen]);

  function reset(next: Screen = 'landing') {
    abortRef.current?.abort();
    if (actionTimer.current) clearTimeout(actionTimer.current);
    actionLock.current = false;
    setActionBusy(false); setLoading(false); setFighters([]); setPending(null); setBattle(null); setPreview(''); setError(''); setRejected(false); setScreen(next);
    setArena(null); setArenaError(''); setSnapFor(null); setSnapping({}); setHunt(null); setHuntEnabled(false); setHuntSummary(null);
  }

  function startDemo() {
    abortRef.current?.abort();
    setLoading(false); setError(''); setRejected(false); setPending(null); setFighters([...DEMO_FIGHTERS.slice(0, 2)]); setScreen('vs');
    setArena(null); setArenaError(''); setHunt(null); setHuntSummary(null);
  }

  function goHome() {
    abortRef.current?.abort();
    if (actionTimer.current) clearTimeout(actionTimer.current);
    actionLock.current = false;
    setActionBusy(false); setLoading(false); setError(''); setScreen('landing');
  }

  async function createFighter(file: File) {
    if (abortRef.current && !abortRef.current.signal.aborted && loading) return;
    const controller = new AbortController();
    abortRef.current?.abort(); abortRef.current = controller;
    setLoading(true); setError(''); setRejected(false); setPreview('');
    // Counter-Hunt: the clock stops when the photo is taken, not when analysis returns.
    if (huntRef.current && huntRef.current.stoppedAt === null) setHunt({ ...huntRef.current, stoppedAt: Date.now() });
    const timeout = setTimeout(() => controller.abort('timeout'), 55000);
    try {
      const image = await compressImage(file);
      if (controller.signal.aborted) return;
      setPreview(image);
      const perception = await fetch('/api/object-analysis', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image }), signal: controller.signal });
      const result = await perception.json();
      if (result.rejected || result.analysis?.rejected) { setRejected(true); throw new Error(result.rejectionReason || result.analysis?.rejectionReason || 'No clear object detected.'); }
      if (!perception.ok || !result.analysis) throw new Error(result.error || 'Our object scanner needs a breather. Try again or use the demo fighters.');
      // Lore Pack runs in parallel with character creation; it can also land after the reveal.
      const avoid = fighters.flatMap(f => f.lore ? [f.lore.corporateTitle, f.lore.linkedInHeadline, ...f.lore.trashTalk] : []);
      const owner = owners[Math.min(fighters.length + 1, 2)];
      const lorePromise = fetch('/api/lore', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ analysis: result.analysis, spice: fxSettings.spice, owner: owner.name || owner.team ? owner : undefined, avoid }), signal: controller.signal })
        .then(r => r.ok ? r.json() : null).catch(() => null);
      const creation = await fetch('/api/character', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ analysis: result.analysis, sourceImage: image }), signal: controller.signal });
      const generated = await creation.json();
      if (!creation.ok) throw new Error(generated.error || 'That fighter didn’t quite materialize. Give it another shot.');
      const valid = gameCharacterSchema.safeParse(generated.character);
      if (!valid.success) throw new Error('That fighter didn’t quite materialize. Give it another shot.');
      if (controller.signal.aborted) return;
      let fighter = valid.data as GameCharacter;
      const activeHunt = huntRef.current;
      if (activeHunt) {
        const seconds = ((activeHunt.stoppedAt ?? Date.now()) - activeHunt.startedAt) / 1000;
        const bonus = applyHuntBonus(activeHunt.target, fighter, seconds);
        fighter = bonus.fighter;
        setHuntSummary(bonus.summary ?? `Counter-Hunt: too slow (${Math.round(seconds)}s), no bonus this time.`);
      }
      setPending(fighter); setScreen('reveal');
      void lorePromise.then(data => attachLore(fighter.id, data));
    } catch (issue) {
      if (controller.signal.aborted && controller.signal.reason !== 'timeout') return;
      setError(controller.signal.reason === 'timeout' ? 'The scanner took too long. Try again, or jump into a battle with demo fighters.' : issue instanceof Error ? issue.message : 'Something interrupted the summon. Try again.');
    } finally { clearTimeout(timeout); if (abortRef.current === controller) setLoading(false); }
  }

  /** Upgrades a fighter card with lore whenever it arrives (before or after the reveal). */
  function attachLore(id: string, data: unknown) {
    const payload = data as { lore?: unknown; source?: 'gemini' | 'fallback' } | null;
    const lore = loreSchema.safeParse(payload?.lore);
    if (!lore.success) return;
    const upgrade = (f: GameCharacter): GameCharacter => f.id === id ? { ...f, lore: lore.data, loreSource: payload?.source ?? 'fallback' } : f;
    setPending(p => p && upgrade(p));
    setFighters(fs => fs.map(upgrade));
  }

  function addFighter() {
    if (!pending) return;
    const next = [...fighters, pending].slice(0, 2);
    setFighters(next); setPending(null); setPreview(''); setError(''); setScreen(next.length === 2 ? 'vs' : 'capture');
    // Player 1 may start a Counter-Hunt for Player 2; it ends once Player 2 joins.
    if (next.length === 1 && huntEnabled) setHunt({ target: pending, startedAt: Date.now(), stoppedAt: null });
    else { setHunt(null); setHuntSummary(null); }
  }

  function startBattle() {
    if (fighters.length !== 2) return;
    if (actionTimer.current) clearTimeout(actionTimer.current);
    actionLock.current = false; setActionBusy(false);
    setSnapFor(null); setSnapping({});
    setPrevBattle(null); setBattle(createBattle(fighters[0], fighters[1], Date.now(), { arena: arena ?? undefined })); setScreen('battle');
  }

  function playRound(move1: BattleMove, move2: BattleMove, calls: Calls = {}) {
    if (!battle || battle.status === 'finished' || actionLock.current) return;
    const next = resolveRound(battle, move1, move2, calls);
    if (next === battle) return;
    actionLock.current = true; setActionBusy(true); setPrevBattle(battle); setBattle(next);
    // Safety net: if the reveal animation ever fails to report back, never strand the players.
    actionTimer.current = setTimeout(finishReveal, 9000);
  }

  /** Laya predicts Player 1's next move; the pure bot turns it into a pick. Falls back to the `reader` bot. */
  const getBotMove: BotPlayer = async state => {
    const rand = seededRandom(state.seed + state.round * 7919);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    try {
      const response = await fetch('/api/bot-move', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(summarizeForBot(state, 'player2')), signal: controller.signal });
      const result = response.ok ? await response.json() : null;
      if (result?.prediction) return { move: botMove(state, 'player2', result.prediction, rand), source: 'laya' };
    } catch { /* offline or slow: built-in bot */ } finally { clearTimeout(timer); }
    return { move: botMove(state, 'player2', null, rand), source: 'builtin' };
  };

  /** Called when the reveal timeline finishes (instantly when animations are skipped). */
  function finishReveal() {
    if (actionTimer.current) clearTimeout(actionTimer.current);
    const current = battleRef.current;
    if (current?.status === 'finished') {
      actionTimer.current = setTimeout(() => { actionLock.current = false; setActionBusy(false); setScreen('winner'); }, fxSettings.instant ? 700 : 1200);
      return;
    }
    actionLock.current = false; setActionBusy(false);
  }

  /** Sound + haptics for reveal events. Muted by default; vibration only where supported. */
  function onFx(event: FxEvent) {
    if (event.type === 'hit') vibrate(event.heavy ? 70 : 40);
    if (fxSettings.muted) return;
    if (event.type === 'countdown') playSfx('tick');
    else if (event.type === 'reveal') playSfx('flip');
    else if (event.type === 'callout') playSfx(event.tone === 'counter' || event.tone === 'call' ? 'counter' : event.tone === 'special' ? 'special' : 'flip');
    else if (event.type === 'hit') playSfx(event.heavy ? 'heavy' : 'hit');
    else if (event.type === 'ko') playSfx('ko');
  }

  // Snap Reinforcement: open the 15 s camera once the reveal has finished.
  useEffect(() => {
    if (screen !== 'battle' || !battle || actionBusy || snapFor) return;
    const next = battle.pendingSnaps.find(slot => !snapping[slot]);
    if (next) setSnapFor(next);
  }, [screen, battle, actionBusy, snapFor, snapping]);

  async function onSnapPhoto(slot: PlayerSlot, file: File) {
    setSnapFor(null); setSnapping(s => ({ ...s, [slot]: true }));
    let item: ReinforcementItem | null = null; let objectName: string | undefined;
    try {
      const image = await compressImage(file);
      const response = await fetch('/api/reinforcement', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image }) });
      const result = await response.json();
      if (response.ok && result.item) { item = result.item; objectName = result.objectName; }
    } catch { /* no item: the snap simply fizzles */ }
    // The analysis ran while players kept picking; apply to whatever the latest state is.
    setBattle(current => current && applyReinforcement(current, slot, item, objectName));
    setSnapping(s => ({ ...s, [slot]: false }));
  }

  function onSnapGiveUp(slot: PlayerSlot) {
    setSnapFor(null);
    setBattle(current => current && applyReinforcement(current, slot, null));
  }

  async function onArenaPhoto(file: File) {
    setArenaBusy(true); setArenaError('');
    try {
      const image = await compressImage(file);
      const response = await fetch('/api/arena', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image }) });
      const result = await response.json();
      if (response.ok && result.arena) setArena(result.arena as ArenaId);
      else setArenaError(result.error || 'Couldn’t read the room. Try another angle, or just fight.');
    } catch { setArenaError('Couldn’t read the room. Try another angle, or just fight.'); }
    finally { setArenaBusy(false); }
  }

  const currentPlayer = Math.min(fighters.length + 1, 2);
  return <div className="app-shell" data-fx={fxSettings.instant ? 'instant' : 'full'}>
    <header className="site-header"><button className="wordmark" aria-label="Object Arena home" onClick={goHome}><span className="logo-icon"><Swords size={21} strokeWidth={2.6}/></span><span>OBJECT<span className="wordmark-arena">ARENA</span><span className="logo-period">®</span></span></button><nav aria-label="Main navigation"><button className="nav-link" onClick={() => setRulesOpen(true)}>How to play<ArrowUpRightIcon/></button><span className="local-badge"><span/>2 PLAYERS · 1 DEVICE</span></nav></header>
    <main ref={mainRef} tabIndex={-1} className={screen === 'landing' ? 'main-content landing-content' : 'main-content game-content'}>
      {screen !== 'landing' && <div className="game-topline"><button className="text-button" onClick={goHome}><ArrowLeft size={15}/>Back to home</button><div className="progress-trail"><span className={screen === 'capture' || screen === 'reveal' ? 'active' : ''}>01 <span>SUMMON</span></span><i/><span className={screen === 'vs' || screen === 'battle' ? 'active' : ''}>02 <span>BATTLE</span></span><i/><span className={screen === 'winner' ? 'active' : ''}>03 <span>GLORY</span></span></div></div>}
      {screen === 'landing' && <><section className="hero"><div className="hero-copy"><p className="eyebrow"><span className="live-dot"/>THE WORLD IS YOUR CHARACTER SELECT</p><h1>EVERYTHING<br/>IS <span className="playable-word">PLAYABLE<svg viewBox="0 0 550 24" aria-hidden="true"><path d="M4 14C104 1 382 3 544 10M56 22C174 12 353 12 482 17"/></svg></span><span className="hero-period">.</span></h1><p className="hero-description">That bottle on your desk?<br/>It has <strong>unfinished business.</strong></p><p className="hero-subcopy">Turn everyday objects into extraordinary fighters.<br className="desktop-break"/> Snap a photo. Find a rival. Settle it in the arena.</p><div className="hero-actions"><button className="button primary hero-primary" onClick={() => reset('capture')}><Camera size={20}/>Snap your fighter<ArrowRight size={20}/></button><button className="button secondary" onClick={startDemo}><Swords size={19}/>Use demo fighters</button></div>{fighters.length > 0 && <button className="resume-link" onClick={() => setScreen(fighters.length === 2 ? 'vs' : 'capture')}>Continue with your {fighters.length} saved fighter{fighters.length > 1 ? 's' : ''}<ArrowRight size={15}/></button>}<div className="hero-footnote"><span><Check size={14}/>No downloads</span><span><Check size={14}/>No sign-ups</span><span><Check size={14}/>Just questionable combat</span></div></div><div className="hero-stage"><div className="stage-grid"/><span className="stage-coordinate">ARENA_001 / YOUR DESK</span><span className="sticker hero-sticker">YOUR STUFF.<br/>BUT VIOLENT.*</span><div className="hero-card hero-card-one"><CharacterCard character={DEMO_FIGHTERS[0]} player={1}/></div><div className="hero-card hero-card-two"><CharacterCard character={DEMO_FIGHTERS[1]} player={2}/></div><div className="hero-vs">VS</div><span className="stage-caption">*Emotionally. They're still objects.</span><Sparkles className="stage-sparkle" size={40} strokeWidth={1.5}/></div></section><div className="marquee" aria-label="Snap it. Spawn it. Battle it."><span>SNAP IT.</span><Sparkles/><span>SPAWN IT.</span><Swords/><span>BATTLE IT.</span><Zap/><span className="marquee-outline">REPEAT.</span><Sparkles/></div><section className="how-it-works" aria-label="How to play"><div className="how-label"><span className="eyebrow">FROM DESK TO DEATHMATCH</span><p>Zero lore.<br/>Maximum rivalry.</p><ArrowDown size={23}/></div><div className="how-step"><span className="step-number">01</span><div className="step-icon"><ScanLine size={24}/></div><h2>Spot a contender.</h2><p>A mug. A sneaker. That suspicious banana. Point, snap, and let the AI do its thing.</p></div><div className="how-step"><span className="step-number">02</span><div className="step-icon"><Sparkles size={24}/></div><h2>Meet your menace.</h2><p>Real object. Ridiculous identity. Unique powers and stats that keep things fair.</p></div><div className="how-step"><span className="step-number">03</span><div className="step-icon"><Flag size={24}/></div><h2>Settle the score.</h2><p>Grab a friend, summon a rival, and battle for completely unnecessary bragging rights.</p></div></section></>}
      {screen === 'capture' && hunt && <HuntBanner target={hunt.target} startedAt={hunt.startedAt} stoppedAt={hunt.stoppedAt}/>}
      {screen === 'capture' && <section className="capture-screen"><div className="capture-intro"><p className="eyebrow"><CircleDot size={14}/>PLAYER 0{currentPlayer} · YOU'RE UP</p><h1 className="screen-title">FIND YOUR<br/><span className="purple-text">FIGHTER.</span></h1><p>Somewhere nearby, an ordinary object<br/>is waiting to become a problem.</p><div className="object-suggestions"><span>BOTTLE</span><span>SHOE</span><span>PLANT</span><span>KEYBOARD</span><span>SOMETHING WEIRD</span></div><div className="capture-tip"><ScanLine size={22}/><p><strong>One object. Good lighting. Big potential.</strong>Keep your contender in the center of the frame.</p></div>{fighters[0] && <div className="waiting-fighter"><img src={fighters[0].sourceImage} alt={fighters[0].object.name}/><div><span className="mono">PLAYER 01 · READY</span><strong>{fighters[0].identity.name}</strong><span>Waiting for a worthy opponent.</span></div><Check size={20}/></div>}<button className="text-button" onClick={startDemo}><Swords size={16}/>Skip the scan. Use demo fighters<ArrowRight size={15}/></button></div><div className="capture-main">{loading ? <LoadingSequence image={preview}/> : <CameraUpload onFile={createFighter} disabled={loading}/>}<div className="capture-error-area">{error && <div className="error-box" role="alert"><strong>{rejected ? 'Find an object fighter 👀' : 'A small summoning hiccup.'}</strong><p>{error}</p>{rejected && <p>Try a bottle, shoe, plant, keyboard, laptop, chair, or something weird nearby.</p>}<button className="text-button" onClick={startDemo}>Use demo fighters<ArrowRight size={14}/></button></div>}</div></div></section>}
      {screen === 'reveal' && pending && <CharacterReveal character={pending} player={currentPlayer} onContinue={addFighter} onRescan={() => { setPending(null); setError(''); setPreview(''); setScreen('capture'); }} hunt={currentPlayer === 1 ? { enabled: huntEnabled, onToggle: setHuntEnabled } : undefined} huntSummary={currentPlayer === 2 ? huntSummary : null} origin={{ answer: originAnswers[pending.id] ?? '', onChange: answer => setOriginAnswers(a => ({ ...a, [pending.id]: answer })) }}/>} 
      {screen === 'vs' && fighters.length === 2 && <VsScreen fighters={fighters} onStart={startBattle} solo={soloBot} onToggleSolo={() => setSoloBot(s => !s)} arena={arena} arenaBusy={arenaBusy} arenaError={arenaError} onArenaPhoto={onArenaPhoto}/>}
      {screen === 'battle' && battle && <BattleArena battle={battle} prev={prevBattle} onRound={playRound} busy={actionBusy || snapFor !== null} snapping={snapping} instant={fxSettings.instant} onTimelineDone={finishReveal} onFx={onFx} bot={soloBot ? getBotMove : undefined}/>}
      {screen === 'winner' && battle && <WinnerScreen battle={battle} onRematch={startBattle} onReset={() => reset('capture')}/>}
      {storageNotice && <p className="storage-notice" role="status">{storageNotice}</p>}
    </main>
    <footer className="site-footer"><span>REAL OBJECTS. UNREAL RIVALRIES.</span><p>Powered by <strong>Gemini</strong><span>+</span><strong>Laya</strong></p><span className="footer-note">MADE FOR A LITTLE FRIENDLY CHAOS<Sparkles size={13}/></span></footer>
    {rulesOpen && <Rules onClose={() => setRulesOpen(false)}/>}
    {screen === 'battle' && snapFor && <SnapModal key={`${battle?.round}-${snapFor}`} player={snapFor === 'player1' ? 1 : 2} onPhoto={file => onSnapPhoto(snapFor, file)} onGiveUp={() => onSnapGiveUp(snapFor)}/>}
    {screen !== 'landing' && <FxControls skip={fxSettings.skip} muted={fxSettings.muted} reducedMotion={fxSettings.reducedMotion} spice={fxSettings.spice} onChange={fxSettings.update} owner={screen === 'capture' || screen === 'reveal' ? { player: currentPlayer, info: owners[currentPlayer], onChange: info => setOwners(o => ({ ...o, [currentPlayer]: info })) } : undefined}/>}
  </div>;
}

function ArrowUpRightIcon() { return <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 12 12 4M4 4h8v8" stroke="currentColor" strokeWidth="1.8"/></svg>; }
function Rules({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = dialogRef.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  return <dialog ref={dialogRef} className="rules-dialog" onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }} aria-labelledby="rules-heading"><div className="rules-content"><button className="icon-button rules-close" onClick={onClose} aria-label="Close how to play"><X size={22}/></button><p className="eyebrow"><Swords size={15}/>A VERY SERIOUS RULEBOOK</p><h2 id="rules-heading">SMALL OBJECTS.<br/>BIG ATTITUDE.</h2><ol><li><strong>Summon two fighters.</strong>Take turns photographing an object, or use our demo duo.</li><li><strong>Pick in secret.</strong>Each round both players lock in a move at the same time: keys A S D F vs J K L ; on a laptop, or pass the phone.</li><li><strong>Outguess your rival.</strong>Strike beats Break. Break smashes Guard. Guard blocks Strike and counters. Special (3 energy) crushes Strike and Break, but a Guard shuts it down.</li><li><strong>Manage energy.</strong>Gain 1 energy every round, plus 1 for guarding. Everyone can see your meter, so a full bar is a threat your rival will play around.</li><li><strong>Use your extras.</strong>Each fighter’s ★ Signature Trait bends one rule. Once per match: Call It (Q / P) to predict your rival’s move, and Snap (G / H) to photograph a Heal, Shield, Energy or Trap item within 15 seconds.</li><li><strong>Claim your glory.</strong>First to zero HP loses; after 12 rounds, the healthier fighter wins. Rarity is for style; it never decides strength.</li></ol><div className="rules-types"><Shield size={20}/><p>Water beats heat. Heat beats nature. Nature beats electric. Electric beats water. Metal holds its ground. Chaos does its own thing.</p></div><button className="button primary wide" onClick={onClose}>Got it. Let’s cause problems.<ArrowRight size={18}/></button></div></dialog>;
}

/** Counter-Hunt countdown shown to Player 2 on the capture screen. */
function HuntBanner({ target, startedAt, stoppedAt }: { target: GameCharacter; startedAt: number; stoppedAt: number | null }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { if (stoppedAt) return; const timer = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(timer); }, [stoppedAt]);
  const left = Math.max(0, HUNT_SECONDS - Math.floor(((stoppedAt ?? now) - startedAt) / 1000));
  return <div className={`hunt-banner ${left <= 10 && !stoppedAt ? 'is-urgent' : ''}`} role="status">
    <strong>{stoppedAt ? 'PHOTO IN!' : left ? `${left}s` : "TIME'S UP"}</strong>
    <span><b>COUNTER-HUNT vs {target.identity.name} ({target.type.primary.toUpperCase()}).</b> {huntHint(target.type.primary)}</span>
  </div>;
}

/** Replaces session-only owner names in generated text before persisting (case-insensitive, whole words). */
function scrubNames(fighters: GameCharacter[], names: string[]): GameCharacter[] {
  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`\\b(${names.map(escape).join('|')})\\b`, 'gi');
  return JSON.parse(JSON.stringify(fighters).replace(pattern, 'their manager')) as GameCharacter[];
}
