import { z } from 'zod';
import { classifyReinforcement } from '../../../lib/ai/scenes';
import { errorResponse, jsonResponse, readJsonBody } from '../../../lib/api/http';

export const runtime = 'nodejs';
export const maxDuration = 20;
const bodySchema = z.object({image: z.string().min(1).max(2_800_000)});

/** POST {image} -> {item, objectName} | 422 {rejected:true}. Category only; effects are fixed in the game engine. */
export async function POST(request: Request) {
  try {
    const {image} = bodySchema.parse(await readJsonBody(request));
    const result = await classifyReinforcement(image);
    return 'rejected' in result ? jsonResponse(result, 422) : jsonResponse(result);
  } catch (error) {return errorResponse(error);}
}
