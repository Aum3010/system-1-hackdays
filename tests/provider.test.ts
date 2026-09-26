import { afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ create: vi.fn(), constructor: vi.fn() }));
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create: mocks.create };
    constructor(options: unknown) {
      mocks.constructor(options);
    }
  },
}));
import { getProvider } from "@/lib/ai/provider";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});
function live() {
  vi.stubEnv("ENABLE_LIVE_AI", "true");
  vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
  vi.stubEnv("ANTHROPIC_MODEL", "test-model");
  return getProvider("live");
}
describe("Anthropic adapter with mocked SDK transport", () => {
  it("maps text messages and finite transport limits", async () => {
    mocks.create.mockResolvedValue({ content: [{ type: "text", text: "result" }] });
    const provider = live();
    const signal = new AbortController().signal;
    expect(
      await provider.complete({ messages: [{ role: "user", content: "hello" }], signal }),
    ).toBe("result");
    expect(mocks.constructor).toHaveBeenCalledWith(
      expect.objectContaining({ timeout: 25000, maxRetries: 0 }),
    );
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "test-model",
        max_tokens: 1400,
        messages: [{ role: "user", content: "hello" }],
      }),
      { signal },
    );
  });
  it("maps a vision image onto the final user message", async () => {
    mocks.create.mockResolvedValue({ content: [{ type: "text", text: "image response" }] });
    await live().complete({
      messages: [{ role: "user", content: "describe" }],
      image: { data: "YWJjZA==", mediaType: "image/png" },
    });
    expect(mocks.create.mock.calls[0][0].messages[0].content[0]).toEqual({
      type: "image",
      source: { type: "base64", media_type: "image/png", data: "YWJjZA==" },
    });
  });
  it("yields text deltas and skips other stream events", async () => {
    mocks.create.mockResolvedValue(
      (async function* () {
        yield { type: "message_start" };
        yield { type: "content_block_delta", delta: { type: "text_delta", text: "Hello" } };
        yield { type: "content_block_delta", delta: { type: "text_delta", text: " world" } };
      })(),
    );
    let output = "";
    for await (const text of live().stream({ messages: [{ role: "user", content: "hi" }] }))
      output += text;
    expect(output).toBe("Hello world");
    expect(mocks.create.mock.calls[0][0].stream).toBe(true);
  });
  it("propagates provider rejection instead of substituting demo", async () => {
    mocks.create.mockRejectedValue(new Error("Transport unavailable"));
    await expect(live().complete({ messages: [{ role: "user", content: "hi" }] })).rejects.toThrow(
      "Transport unavailable",
    );
  });
});
