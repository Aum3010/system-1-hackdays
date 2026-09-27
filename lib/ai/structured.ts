import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { findUnsafe } from './safety';
import { layaSafetyFlag } from './layaSafety';

/**
 * One path for every flavor-text Gemini call:
 * structured JSON -> Zod (with server-side truncation) -> blocklist -> Laya safety check -> retry once -> canned fallback.
 * The game never blocks: a total time budget covers both attempts, then the fallback is returned.
 */
export type FlavorSource = 'gemini' | 'fallback';
export interface TransportRequest { system: string; prompt: string; jsonSchema: unknown; maxTokens: number; signal: AbortSignal; retry: boolean }
/** Injectable seam so route tests can simulate valid, invalid, slow or unsafe Gemini output. */
export type Transport = (request: TransportRequest) => Promise<string>;

export { capped } from '../validation/lore';

export function geminiTransport(): Transport | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  const client = new GoogleGenAI({ apiKey });
  return async ({ system, prompt, jsonSchema, maxTokens, signal, retry }) => {
    const result = await client.interactions.create({
      model: process.env.GEMINI_MODEL?.trim() || 'gemini-3.8-flash',
      store: false,
      system_instruction: system,
      input: [{ type: 'text', text: retry ? `${prompt}\n\nYour previous answer was not valid. Return ONLY JSON that matches the schema exactly, with short strings.` : prompt }],
      response_format: { type: 'text', mime_type: 'application/json', schema: jsonSchema as Record<string, unknown> },
      generation_config: { max_output_tokens: maxTokens, thinking_level: 'low' },
    }, { signal, maxRetries: 0 });
    return result.output_text || '';
  };
}

export interface StructuredOptions<T extends z.ZodType> {
  label: string;
  schema: T;
  system: string;
  prompt: string;
  fallback: () => z.infer<T>;
  timeoutMs: number;
  maxTokens?: number;
  /** Defaults to the real Gemini transport; null (no API key) goes straight to the fallback. */
  transport?: Transport | null;
  /** Second safety layer after the blocklist; defaults to Laya (no-op when Laya is off). */
  safetyCheck?: (data: unknown) => Promise<string | null>;
}

export async function generateStructured<T extends z.ZodType>(options: StructuredOptions<T>): Promise<{ data: z.infer<T>; source: FlavorSource; reason?: string }> {
  const transport = options.transport === undefined ? geminiTransport() : options.transport;
  if (!transport) return { data: options.fallback(), source: 'fallback', reason: 'not-configured' };
  const deadline = Date.now() + options.timeoutMs;
  const jsonSchema = z.toJSONSchema(options.schema, { io: 'input' });
  let reason = 'invalid';
  for (let attempt = 0; attempt < 2; attempt++) {
    const remaining = deadline - Date.now();
    if (remaining <= 250) { reason = 'timeout'; break; }
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error('TIMEOUT')); }, remaining); });
      const text = await Promise.race([transport({ system: options.system, prompt: options.prompt, jsonSchema, maxTokens: options.maxTokens ?? 1200, signal: controller.signal, retry: attempt > 0 }), timeout]);
      const parsed = options.schema.safeParse(JSON.parse(text));
      if (!parsed.success) { reason = 'invalid'; continue; }
      if (findUnsafe(parsed.data)) {
        // Unsafe text is never retried: use the canned copy.
        console.warn(`[${options.label}] blocked by safety filter`);
        return { data: options.fallback(), source: 'fallback', reason: 'unsafe' };
      }
      const flagged = await (options.safetyCheck ?? layaSafetyFlag)(parsed.data);
      if (flagged) {
        console.warn(`[${options.label}] blocked by Laya safety check`, { topic: flagged });
        return { data: options.fallback(), source: 'fallback', reason: 'unsafe' };
      }
      return { data: parsed.data, source: 'gemini' };
    } catch (error) {
      reason = error instanceof Error && error.message === 'TIMEOUT' ? 'timeout' : 'invalid';
      if (reason === 'timeout') break;
    } finally { if (timer) clearTimeout(timer); }
  }
  // Never log provider messages or generated content.
  console.warn(`[${options.label}] using fallback`, { reason });
  return { data: options.fallback(), source: 'fallback', reason };
}
