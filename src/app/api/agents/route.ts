import { readRequest, errorResponse } from "@/lib/api";
import { agentSchema } from "@/lib/schemas";
import { getProvider } from "@/lib/ai/provider";
import { runAgent } from "@/lib/runners";
export async function POST(request: Request) {
  try {
    const input = await readRequest(request, agentSchema, "agents");
    return Response.json(
      await runAgent(
        input,
        getProvider(input.mode),
        AbortSignal.any([request.signal, AbortSignal.timeout(30000)]),
      ),
    );
  } catch (error) {
    return errorResponse(error);
  }
}
