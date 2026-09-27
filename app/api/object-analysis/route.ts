import { z } from 'zod';
import { analyzeObject } from '../../../lib/ai/gemini';
import { errorResponse, jsonResponse, readJsonBody } from '../../../lib/api/http';

export const runtime = 'nodejs';
export const maxDuration = 30;
const bodySchema = z.object({image: z.string().min(1).max(2_800_000)});

export async function POST(request: Request) {
  try {
    const {image} = bodySchema.parse(await readJsonBody(request));
    const analysis = await analyzeObject(image);
    if (analysis.rejected) return jsonResponse(analysis, 422);
    return jsonResponse({analysis});
  } catch (error) {return errorResponse(error);}
}
