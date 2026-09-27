import { z } from 'zod';
import { classifyCharacter } from '../../../lib/decision/DecisionEngineService';
import { characterDecisionSchema, objectAnalysisSchema } from '../../../lib/validation/schemas';
import { AppError, errorResponse, jsonResponse, readJsonBody } from '../../../lib/api/http';

export const runtime = 'nodejs';
const bodySchema = z.object({analysis: objectAnalysisSchema});

export async function POST(request: Request) {
  try {
    const {analysis} = bodySchema.parse(await readJsonBody(request, 16_000));
    if (analysis.confidence < 0.55) throw new AppError('INVALID_OBJECT', 'Find an object fighter. Try a clearer photo.', 422);
    const decision = characterDecisionSchema.parse(await classifyCharacter(analysis));
    return jsonResponse({decision});
  } catch (error) {return errorResponse(error);}
}
