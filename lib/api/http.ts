import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(public code: string, message: string, public status = 400) { super(message); }
}

/** Limit the actual stream, including requests with no Content-Length. */
export async function readJsonBody(request: Request, limit = 3_000_000): Promise<unknown> {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    throw new AppError('INVALID_REQUEST', 'Please send an image using the upload button.', 415);
  }
  if (Number(request.headers.get('content-length')) > limit) throw new AppError('IMAGE_TOO_LARGE', 'That photo is too large. Try a smaller image.', 413);
  const reader = request.body?.getReader();
  if (!reader) throw new AppError('INVALID_REQUEST', 'No image was received. Please try again.');
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) {
        await reader.cancel();
        throw new AppError('IMAGE_TOO_LARGE', 'That photo is too large. Try a smaller image.', 413);
      }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('INVALID_REQUEST', 'The upload could not be read. Please try again.');
  } finally { reader.releaseLock(); }
}

export function jsonResponse(body: unknown, status = 200) {
  return Response.json(body, {status, headers: {'Cache-Control': 'no-store'}});
}

export function errorResponse(error: unknown) {
  if (error instanceof AppError) return jsonResponse({error: error.message, code: error.code}, error.status);
  if (error instanceof ZodError) return jsonResponse({error: 'That fighter data is incomplete. Please scan your object again.', code: 'INVALID_REQUEST'}, 400);
  console.error('[api] request failed', {name: error instanceof Error ? error.name : 'UnknownError'});
  return jsonResponse({error: 'The arena hit a little turbulence. Please try again.', code: 'INTERNAL_ERROR'}, 500);
}
