import "server-only";
import { z } from "zod";
import { isFeatureEnabled, type FeatureId } from "@/config/features";
import { ProviderUnavailableError } from "@/lib/ai/provider";

export class RequestError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
// A local process budget. Replace with authenticated distributed quotas before public deployment.
const budget = { start: 0, count: 0 };
export async function readRequest<T>(
  request: Request,
  schema: z.ZodType<T>,
  feature: FeatureId,
): Promise<T> {
  if (!isFeatureEnabled(feature)) throw new RequestError("This feature is disabled.", 404);
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    throw new RequestError("Cross-origin requests are not allowed.", 403);
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new RequestError("Use application/json.", 415);
  const now = Date.now();
  if (now - budget.start > 60000) {
    budget.start = now;
    budget.count = 0;
  }
  if (++budget.count > 60)
    throw new RequestError("Workspace request limit reached. Try again in a minute.", 429);
  const maxBytes = feature === "vision" ? 5700000 : 750000;
  if (Number(request.headers.get("content-length") || 0) > maxBytes)
    throw new RequestError("Request is too large.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new RequestError("Request body is required.");
  const decoder = new TextDecoder();
  let bytes = 0;
  let body = "";
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel();
        throw new RequestError("Request is too large.", 413);
      }
      body += decoder.decode(part.value, { stream: true });
    }
    body += decoder.decode();
  } finally {
    reader.releaseLock();
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new RequestError("Invalid JSON body.");
  }
  return schema.parse(parsed);
}
export function publicError(error: unknown) {
  if (error instanceof RequestError) return { message: error.message, status: error.status };
  if (error instanceof z.ZodError)
    return { message: error.issues[0]?.message || "Invalid request.", status: 400 };
  if (error instanceof ProviderUnavailableError) return { message: error.message, status: 503 };
  if (error instanceof Error && error.name === "AbortError")
    return { message: "Request cancelled or timed out.", status: 408 };
  return {
    message:
      "The AI provider could not complete this request. Check server configuration or try Demo Mode.",
    status: 502,
  };
}
export function errorResponse(error: unknown) {
  const result = publicError(error);
  return Response.json(
    { error: result.message },
    { status: result.status, headers: { "Cache-Control": "no-store" } },
  );
}
