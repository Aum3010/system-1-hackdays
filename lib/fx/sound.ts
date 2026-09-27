/**
 * Tiny Web Audio synth (no audio files). Browser-only; every call is a no-op if audio is
 * unavailable. Sound is muted by default and only plays after the user unmutes (a user gesture).
 */
export type Sfx = 'tick' | 'flip' | 'hit' | 'heavy' | 'counter' | 'special' | 'ko';
let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx ??= new Ctor();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(ac: AudioContext, freq: number, endFreq: number, start: number, duration: number, type: OscillatorType, volume: number) {
  const osc = ac.createOscillator(), gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), start + duration);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start(start); osc.stop(start + duration + .02);
}

function noise(ac: AudioContext, start: number, duration: number, volume: number) {
  const buffer = ac.createBuffer(1, Math.floor(ac.sampleRate * duration), ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = ac.createBufferSource(), gain = ac.createGain();
  src.buffer = buffer; gain.gain.value = volume;
  src.connect(gain).connect(ac.destination);
  src.start(start);
}

export function playSfx(sfx: Sfx) {
  try {
    const ac = audio();
    if (!ac) return;
    const t = ac.currentTime;
    switch (sfx) {
      case 'tick': tone(ac, 880, 880, t, .06, 'square', .05); break;
      case 'flip': tone(ac, 400, 1200, t, .09, 'triangle', .08); break;
      case 'hit': noise(ac, t, .12, .18); tone(ac, 180, 60, t, .14, 'sine', .25); break;
      case 'heavy': noise(ac, t, .22, .3); tone(ac, 140, 40, t, .25, 'sine', .35); break;
      case 'counter': tone(ac, 520, 520, t, .08, 'square', .07); tone(ac, 780, 780, t + .08, .12, 'square', .07); break;
      case 'special': tone(ac, 200, 1400, t, .35, 'sawtooth', .06); break;
      case 'ko': tone(ac, 600, 60, t, .9, 'sawtooth', .08); noise(ac, t, .4, .2); break;
    }
  } catch { /* audio is optional */ }
}

export function vibrate(ms: number) {
  try { if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(ms); } catch { /* optional */ }
}
