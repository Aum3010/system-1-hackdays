import { getProvider } from "@/lib/ai/provider";
import { errorResponse, publicError, readRequest } from "@/lib/api";
import { chatSchema } from "@/lib/schemas";
import type { StreamEvent } from "@/lib/ai/types";

export async function POST(request: Request) {
  try {
    const input = await readRequest(request, chatSchema, "chat");
    const provider = getProvider(input.mode);
    const abort = new AbortController();
    const signal = AbortSignal.any([request.signal, abort.signal, AbortSignal.timeout(30000)]);
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: StreamEvent) => {
          if (!abort.signal.aborted)
            controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
        };
        try {
          for await (const text of provider.stream({ messages: input.messages, signal }))
            send({ type: "text", text });
          send({ type: "done", provider: provider.id });
        } catch (error) {
          send({ type: "error", message: publicError(error).message });
        } finally {
          if (!abort.signal.aborted) controller.close();
        }
      },
      cancel() {
        abort.abort();
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
