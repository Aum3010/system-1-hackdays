import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";
import type { AIProvider, GenerateInput } from "./types";
import { demoProvider } from "./demo";

export class ProviderUnavailableError extends Error {}
export function providerStatus() {
  return {
    demo: true,
    live: process.env.ENABLE_LIVE_AI === "true" && !!process.env.ANTHROPIC_API_KEY,
    provider: "anthropic",
    model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5",
  };
}
function messages(input: GenerateInput): MessageParam[] {
  return input.messages.map((message, index) =>
    input.image && index === input.messages.length - 1 && message.role === "user"
      ? {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: input.image.mediaType, data: input.image.data },
            },
            { type: "text", text: message.content },
          ],
        }
      : { role: message.role, content: message.content },
  );
}
export function getProvider(mode: "demo" | "live"): AIProvider {
  if (mode === "demo") return demoProvider;
  const status = providerStatus();
  if (!status.live)
    throw new ProviderUnavailableError(
      "Live AI is not configured. Use Demo Mode, or set ANTHROPIC_API_KEY and ENABLE_LIVE_AI=true in .env.local and restart the server.",
    );
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    timeout: 25000,
    maxRetries: 0,
  });
  return {
    id: "anthropic",
    model: status.model,
    async complete(input) {
      const result = await client.messages.create(
        {
          model: status.model,
          max_tokens: 1400,
          system:
            input.system ||
            "You are a concise, practical hackathon assistant. Be honest about uncertainty.",
          messages: messages(input),
        },
        { signal: input.signal },
      );
      return result.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("\n");
    },
    async *stream(input) {
      const stream = await client.messages.create(
        {
          model: status.model,
          max_tokens: 1400,
          stream: true,
          system:
            input.system ||
            "You are a concise, practical hackathon assistant. Be honest about uncertainty.",
          messages: messages(input),
        },
        { signal: input.signal },
      );
      for await (const event of stream)
        if (event.type === "content_block_delta" && event.delta.type === "text_delta")
          yield event.delta.text;
    },
  };
}
