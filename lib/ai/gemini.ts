import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import type { ObjectAnalysis, ObjectRejection } from '../../types/object';
import { objectAnalysisSchema, objectResultSchema } from '../validation/schemas';
import { AppError } from '../api/http';
import { validateImageDataUrl, type ValidatedImage } from './imageInput';
import { OBJECT_SYSTEM_PROMPT } from './prompts';

export type AnalyzeResult = ObjectAnalysis | ObjectRejection;
export type GeminiRequest = (image: ValidatedImage, retry: boolean, signal: AbortSignal) => Promise<string | null | undefined>;
export const GEMINI_ATTEMPT_TIMEOUT_MS = 12_000;
// A single root object avoids ambiguous top-level union branches in model output.
export const geminiEnvelopeSchema = z.object({
  rejected: z.boolean(),
  rejectionReason: z.string().max(180).nullable(),
  analysis: objectAnalysisSchema.nullable(),
});

/** Exported transport seam supports provider tests without ever faking the normal API path. */
export async function analyzeWithProvider(image: ValidatedImage, request: GeminiRequest, timeoutMs = GEMINI_ATTEMPT_TIMEOUT_MS): Promise<AnalyzeResult> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {controller.abort(); reject(new Error('GEMINI_TIMEOUT'));}, timeoutMs);
      });
      const text = await Promise.race([request(image, attempt > 0, controller.signal), timeout]);
      const result = objectResultSchema.parse(JSON.parse(text ?? ''));
      if (result.rejected) return result;
      if (result.confidence < 0.55) return {rejected: true, rejectionReason: 'No clear object detected. Try a closer, brighter photo.'};
      return result;
    } catch (error) {
      // Deliberately never log provider messages, photo contents, or credentials.
      console.warn('[gemini] attempt failed', {attempt: attempt + 1, name: error instanceof Error ? error.name : 'UnknownError'});
    } finally { if (timer) clearTimeout(timer); }
  }
  throw new AppError('GEMINI_UNAVAILABLE', 'Your fighter is being camera-shy. Try again, or use the demo fighters.', 503);
}

export async function analyzeObject(imageDataUrl: string): Promise<AnalyzeResult> {
  const image = validateImageDataUrl(imageDataUrl);
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new AppError('GEMINI_NOT_CONFIGURED', 'Photo scanning is taking a break. Use demo fighters to jump into the arena.', 503);
  const client = new GoogleGenAI({apiKey});
  const request: GeminiRequest = async (photo, retry, signal) => {
    const result = await client.interactions.create({
      model: process.env.GEMINI_MODEL?.trim() || 'gemini-3.8-flash',
      store: false,
      system_instruction: OBJECT_SYSTEM_PROMPT,
      input: [
        {type: 'text', text: retry ? 'Analyze this object. Return valid JSON matching the schema exactly; keep all text fields short.' : 'Turn the primary everyday object in this photo into a playful fighter identity.'},
        {type: 'image', data: photo.data, mime_type: photo.mimeType},
      ],
      response_format: {type: 'text', mime_type: 'application/json', schema: z.toJSONSchema(geminiEnvelopeSchema)},
      generation_config: {max_output_tokens: 1400, thinking_level: 'low'},
    }, {signal, timeout: GEMINI_ATTEMPT_TIMEOUT_MS, maxRetries: 0});
    const envelope = geminiEnvelopeSchema.parse(JSON.parse(result.output_text || ''));
    return JSON.stringify(envelope.rejected
      ? {rejected:true,rejectionReason:envelope.rejectionReason || 'No clear object detected.'}
      : objectAnalysisSchema.parse(envelope.analysis));
  };
  return analyzeWithProvider(image, request);
}
