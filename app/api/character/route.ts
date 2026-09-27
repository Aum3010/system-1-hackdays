import { z } from 'zod';
import { classifyCharacter } from '../../../lib/decision/DecisionEngineService';
import { createCharacter } from '../../../lib/game/characterEngine';
import { gameCharacterSchema, objectAnalysisSchema } from '../../../lib/validation/schemas';
import { validateImageDataUrl } from '../../../lib/ai/imageInput';
import { identityRules } from '../../../lib/game/identity';
import { AppError, errorResponse, jsonResponse, readJsonBody } from '../../../lib/api/http';

export const runtime = 'nodejs';
const bodySchema = z.object({analysis: objectAnalysisSchema, sourceImage: z.string().min(1).max(2_800_000)});

export async function POST(request: Request) {
  try {
    const {analysis, sourceImage} = bodySchema.parse(await readJsonBody(request));
    validateImageDataUrl(sourceImage);
    if (analysis.confidence < 0.55) throw new AppError('INVALID_OBJECT', 'Find an object fighter. Try a clearer photo.', 422);
    // Flavor text (lore, announcer lines) comes from /api/lore, fired by the client in parallel.
    const [decision, rules] = await Promise.all([classifyCharacter(analysis), identityRules(analysis)]);
    const character = gameCharacterSchema.parse({ ...createCharacter(analysis, decision, sourceImage, 'gemini'), trait: rules.trait, jargon: rules.jargon });
    return jsonResponse({character});
  } catch (error) {return errorResponse(error);}
}
