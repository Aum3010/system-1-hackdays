import { readRequest, errorResponse } from "@/lib/api";
import { voiceSchema } from "@/lib/schemas";
import { getProvider } from "@/lib/ai/provider";
export async function POST(request: Request) {
  try {
    const input = await readRequest(request, voiceSchema, "voice");
    const provider = getProvider(input.mode);
    return Response.json({
      output: await provider.complete({
        messages: [{ role: "user", content: input.prompt }],
        signal: request.signal,
      }),
      provider: provider.id,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
