import { askLaya, layaConfigured, readNoul, type LayaQuestion } from '../decision/layaClient';

/**
 * Second safety layer after the regex blocklist (safety.ts): Laya yes/no questions, asked of
 * EACH generated line separately. Measured on a live laya-serve (Sept 26):
 *  - Single lines are clear: clean lore <= .14 on every question; "votes for the party" politics .77,
 *    "kick his teeth in" violence .84, "our manager Dave is useless and everyone hates him" person .71.
 *  - Checking a whole Lore Pack (or 300-1100 char chunks) was unreliable: bad lines were diluted,
 *    and short chunks of cartoon-fight narration were flagged as violence.
 *  - Limits: subtle digs at a person ("unlike our manager Dave, this bottle is useful") score ~.18
 *    and pass. Profanity and alcohol are left to the regex blocklist, which already covers them.
 *  - Cost: ~1 s per line on CPU (~12 s per Lore Pack), after Gemini. Much faster on a GPU.
 * Fails open (returns null) when Laya is off, slow or erroring; the blocklist still applies.
 */
export const SAFETY_QUESTIONS: Record<string, LayaQuestion> = {
  person: { type: 'noul', instructions: 'Does `text` insult or make fun of a real person or group of people?' },
  violence: { type: 'noul', instructions: 'Does `text` describe real violence or injury to a person?' },
  politics: { type: 'noul', instructions: 'Does `text` mention politics, elections, voting, political parties or religion?' },
};
export const SAFETY_THRESHOLDS: Record<string, number> = { person: .5, violence: .6, politics: .5 };
export const SAFETY_TIMEOUT_MS = 20_000;
/** Bounded work per call; CPU-bound, so more parallel requests do not help. */
const MAX_LINES = 16, CONCURRENCY = 2;

export function collectText(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value.replace(/\{(self|opponent|move)\}/g, 'the fighter'));
  else if (Array.isArray(value)) value.forEach(v => collectText(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach(v => collectText(v, out));
  return out;
}

/** Returns the first flagged topic, or null when clean, Laya is off, or the check failed / ran out of time. */
export async function layaSafetyFlag(value: unknown, timeoutMs = SAFETY_TIMEOUT_MS): Promise<string | null> {
  if (!layaConfigured()) return null;
  const lines = [...new Set(collectText(value).map(line => line.trim()).filter(Boolean))].slice(0, MAX_LINES);
  const deadline = Date.now() + timeoutMs;
  let next = 0, flagged: string | null = null;
  try {
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, lines.length) }, async () => {
      while (next < lines.length && !flagged) {
        const remaining = deadline - Date.now();
        if (remaining <= 250) throw new Error('Laya timed out');
        const answers = await askLaya({ text: lines[next++] }, SAFETY_QUESTIONS, { timeoutMs: remaining });
        for (const [topic, threshold] of Object.entries(SAFETY_THRESHOLDS)) {
          const answer = readNoul(answers[topic]);
          if (answer && answer.noul >= threshold) { flagged ??= topic; break; }
        }
      }
    }));
  } catch { return flagged; /* fail open unless something was already flagged */ }
  return flagged;
}
