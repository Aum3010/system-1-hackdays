import { z } from 'zod';
import { classifyArena } from '../../../lib/ai/scenes';
import { errorResponse, jsonResponse, readJsonBody } from '../../../lib/api/http';

export const runtime = 'nodejs';
export const maxDuration = 20;
const bodySchema = z.object({image: z.string().min(1).max(2_800_000)});

/** POST {image} -> {arena} | 422 {rejected:true}. One pre-fight call; the +10% buff is fixed in the engine. */
export async function POST(request: Request) {
  try {
    const {image} = bodySchema.parse(await readJsonBody(request));
    const result = await classifyArena(image);
    return 'rejected' in result ? jsonResponse(result, 422) : jsonResponse(result);
  } catch (error) {return errorResponse(error);}
}
