import { readRequest, errorResponse } from "@/lib/api";
import { workflowSchema } from "@/lib/schemas";
import { getProvider } from "@/lib/ai/provider";
import { runWorkflow } from "@/lib/runners";
export async function POST(request: Request) {
  try {
    const input = await readRequest(request, workflowSchema, "workflows");
    return Response.json(
      await runWorkflow(
        input,
        getProvider(input.mode),
        AbortSignal.any([request.signal, AbortSignal.timeout(85000)]),
      ),
    );
  } catch (error) {
    return errorResponse(error);
  }
}
