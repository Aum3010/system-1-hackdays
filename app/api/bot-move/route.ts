import { z } from 'zod';
import { predictHumanMove } from '../../../lib/decision/layaBot';
import { layaConfigured } from '../../../lib/decision/layaClient';
import { AppError, errorResponse, jsonResponse, readJsonBody } from '../../../lib/api/http';

export const runtime = 'nodejs';
export const maxDuration = 10;
const move = z.enum(['strike', 'guard', 'break', 'special']);
const bodySchema = z.object({
  opponentMoves: z.array(move).max(12), opponentEnergy: z.number().int().min(0).max(10),
  opponentSpecialReady: z.boolean(), botEnergy: z.number().int().min(0).max(10), round: z.number().int().min(0).max(50),
});

/** POST BotSummary -> {prediction} (Laya's read of the human's next move) | 503 so the client plays `reader`. */
export async function POST(request: Request) {
  try {
    const summary = bodySchema.parse(await readJsonBody(request, 4_000));
    if (!layaConfigured()) throw new AppError('LAYA_NOT_CONFIGURED', 'Laya is off; the built-in bot plays instead.', 503);
    try { return jsonResponse({ prediction: await predictHumanMove(summary), source: 'laya' }); }
    catch { throw new AppError('LAYA_UNAVAILABLE', 'Laya is busy; the built-in bot plays instead.', 503); }
  } catch (error) { return errorResponse(error); }
}
