import { readRequest, errorResponse, RequestError } from "@/lib/api";
import { visionSchema } from "@/lib/schemas";
import { getProvider } from "@/lib/ai/provider";
import { hasImageSignature } from "@/lib/image-validation";
export async function POST(request: Request) {
  try {
    const input = await readRequest(request, visionSchema, "vision");
    if (!hasImageSignature(input.image))
      throw new RequestError("The file does not match a supported image format, or exceeds 4 MB.");
    const provider = getProvider(input.mode);
    const output = await provider.complete({
      messages: [{ role: "user", content: input.prompt }],
      image: input.image,
      signal: request.signal,
    });
    return Response.json({ output, provider: provider.id });
  } catch (error) {
    return errorResponse(error);
  }
}
