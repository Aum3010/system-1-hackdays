/**
 * Shared HTTP client for a Laya typed-decision server (`laya-serve`, POST /v1/systemone).
 * Laya answers typed questions (choice / score / noul) with calibrated probabilities; it never
 * generates text. Every caller must treat an error or timeout as "use the deterministic rule".
 * Protocol: https://huggingface.co/convaiinnovations/laya#self-hosting-jev-compatible-http-server
 */
export type LayaQuestion =
  | { type: 'choice'; instructions: string; criteria: Record<string, string> }
  | { type: 'score'; instructions: string; criteria: string[] }
  | { type: 'noul'; instructions: string; criteria?: { true?: string; false?: string } };

export interface LayaChoiceAnswer { choice: string; probabilities: Record<string, number>; confidence: number }
export interface LayaScoreAnswer { score: number; confidence: number }
export interface LayaNoulAnswer { noul: number; confidence: number }

export const layaConfigured = () => Boolean(process.env.LAYA_ENDPOINT?.trim());

export function layaTimeoutMs(fallback = 2500): number {
  const value = Number(process.env.LAYA_TIMEOUT_MS || fallback);
  return Number.isFinite(value) ? Math.max(250, Math.min(30000, value)) : fallback;
}

export function layaUrl(endpoint: string): URL {
  const url = new URL(endpoint);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Invalid Laya endpoint');
  if (url.pathname === '/' || url.pathname === '') url.pathname = '/v1/systemone';
  return url;
}

/** Sends one state + questions; returns the raw `answers` object. Throws on HTTP error, bad shape or timeout. */
export async function askLaya(
  state: unknown,
  questions: Record<string, LayaQuestion>,
  { endpoint = process.env.LAYA_ENDPOINT, token = process.env.LAYA_API_KEY || process.env.HUGGINGFACE_API_TOKEN, timeoutMs = layaTimeoutMs() }: { endpoint?: string; token?: string; timeoutMs?: number } = {},
): Promise<Record<string, unknown>> {
  if (!endpoint) throw new Error('Laya endpoint not configured');
  const url = layaUrl(endpoint);
  const abort = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const request = async () => {
    const response = await fetch(url, {
      method: 'POST', cache: 'no-store', signal: abort.signal,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ state, questions }),
    });
    if (!response.ok) throw new Error(`Laya returned HTTP ${response.status}`);
    const data: unknown = await response.json();
    if (!data || typeof data !== 'object' || !('answers' in data) || !data.answers || typeof data.answers !== 'object') throw new Error('Invalid Laya response');
    return data.answers as Record<string, unknown>;
  };
  try {
    return await Promise.race([
      request(),
      new Promise<never>((_, reject) => { timer = setTimeout(() => { abort.abort(); reject(new Error('Laya timed out')); }, timeoutMs); }),
    ]);
  } finally { if (timer) clearTimeout(timer); }
}

const num = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : undefined;
/** `answer_confidence` is Laya's calibrated confidence on every question type; older servers only send `confidence`. */
const conf = (a: Record<string, unknown>) => num(a.answer_confidence) ?? num(a.confidence) ?? 0;

export function readChoice<T extends string>(answer: unknown, allowed: readonly T[]): (LayaChoiceAnswer & { choice: T }) | undefined {
  if (!answer || typeof answer !== 'object') return undefined;
  const a = answer as Record<string, unknown>;
  if (typeof a.choice !== 'string' || !(allowed as readonly string[]).includes(a.choice)) return undefined;
  const probabilities = a.probabilities && typeof a.probabilities === 'object' ? Object.fromEntries(Object.entries(a.probabilities).filter(([, v]) => num(v) !== undefined)) as Record<string, number> : {};
  return { choice: a.choice as T, probabilities, confidence: conf(a) };
}

export function readScore(answer: unknown): LayaScoreAnswer | undefined {
  if (!answer || typeof answer !== 'object') return undefined;
  const a = answer as Record<string, unknown>;
  const score = num(a.score);
  return score === undefined ? undefined : { score, confidence: conf(a) };
}

export function readNoul(answer: unknown): LayaNoulAnswer | undefined {
  if (!answer || typeof answer !== 'object') return undefined;
  const a = answer as Record<string, unknown>;
  const noul = num(a.noul);
  return noul === undefined ? undefined : { noul, confidence: conf(a) };
}
