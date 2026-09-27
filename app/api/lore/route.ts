import { z } from 'zod';
import { generateLore } from '../../../lib/ai/lore';
import { objectAnalysisSchema } from '../../../lib/validation/schemas';
import { errorResponse, jsonResponse, readJsonBody } from '../../../lib/api/http';
import { SPICES } from '../../../lib/ai/persona';

export const runtime = 'nodejs';
export const maxDuration = 20;
const bodySchema = z.object({
  analysis: objectAnalysisSchema,
  spice: z.enum(SPICES as ['mild', 'spicy', 'unhinged']).default('unhinged'),
  owner: z.object({ name: z.string().trim().max(24).optional(), team: z.enum(['Eng', 'Sales', 'Design', 'Ops', 'Other']).optional() }).optional(),
  avoid: z.array(z.string().max(160)).max(30).optional(),
});

/** POST {analysis, spice, owner?, avoid?} -> {lore, source, jargon}. Always 200 with Gemini or canned lore. */
export async function POST(request: Request) {
  try {
    const input = bodySchema.parse(await readJsonBody(request));
    return jsonResponse(await generateLore(input));
  } catch (error) { return errorResponse(error); }
}
