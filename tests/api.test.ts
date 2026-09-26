import { afterEach, describe, expect, it, vi } from "vitest";
import { POST as chat } from "@/app/api/chat/route";
import { POST as agents } from "@/app/api/agents/route";
import { POST as knowledge } from "@/app/api/knowledge/route";
import { POST as vision } from "@/app/api/vision/route";
import { POST as voice } from "@/app/api/voice/route";
import { POST as workflows } from "@/app/api/workflows/route";
import { GET as status } from "@/app/api/status/route";
import { getProvider } from "@/lib/ai/provider";
import { publicError, readRequest } from "@/lib/api";
import { chatSchema } from "@/lib/schemas";
import { sampleDocument } from "@/lib/knowledge";
import { isFeatureEnabled } from "@/config/features";

afterEach(() => vi.unstubAllEnvs());
function request(path: string, body: unknown, headers: Record<string, string> = {}) {
  return new Request(`http://localhost:3000/api/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}
describe("credential-free route integration", () => {
  it("streams demo chat with no API key", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const response = await chat(
      request("chat", { messages: [{ role: "user", content: "Build an MVP" }] }),
    );
    expect(response.status).toBe(200);
    const output = await response.text();
    expect(output).toContain('"type":"done"');
    expect(output).toContain('"provider":"demo"');
  });
  it("executes real agent tools in demo mode", async () => {
    const response = await agents(request("agents", { goal: "8*7", tools: ["calculator"] }));
    expect(response.status).toBe(200);
    expect((await response.json()).steps[0].output).toBe("8*7 = 56");
  });
  it("returns grounded source citations", async () => {
    const response = await knowledge(
      request("knowledge", { query: "credentials", documents: [sampleDocument] }),
    );
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.citations[0].documentId).toBe(sampleDocument.id);
    expect(data.output).toContain("[1]");
  });
  it("labels demo vision without claiming image understanding", async () => {
    const data =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1kAAAAASUVORK5CYII=";
    const response = await vision(
      request("vision", { prompt: "Describe this", image: { data, mediaType: "image/png" } }),
    );
    expect(response.status).toBe(200);
    expect((await response.json()).output).toContain("has not been interpreted");
  });
  it("supports the typed voice fallback", async () => {
    const response = await voice(request("voice", { prompt: "Plan my day" }));
    expect(response.status).toBe(200);
    expect((await response.json()).provider).toBe("demo");
  });
  it("executes a whole demo workflow", async () => {
    const response = await workflows(
      request("workflows", { template: "idea-to-pitch", input: "Research assistant" }),
    );
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.steps).toHaveLength(3);
    expect(data.success).toBe(true);
  });
});
describe("API boundaries", () => {
  it("rejects invalid request data", async () =>
    expect((await chat(request("chat", { messages: [] }))).status).toBe(400));
  it("rejects malformed JSON", async () =>
    expect(
      (
        await chat(
          new Request("http://localhost:3000/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "bad",
          }),
        )
      ).status,
    ).toBe(400));
  it("rejects cross-origin requests", async () =>
    expect(
      (await chat(request("chat", { messages: [] }, { Origin: "https://example.com" }))).status,
    ).toBe(403));
  it("rejects incorrect content type", async () =>
    expect((await chat(request("chat", {}, { "Content-Type": "text/plain" }))).status).toBe(415));
  it("enforces actual body bytes without a content-length header", async () =>
    expect((await chat(request("chat", { text: "x".repeat(750001) }))).status).toBe(413));
  it("enforces feature gates on routes and registry", async () => {
    vi.stubEnv("NEXT_PUBLIC_DISABLED_FEATURES", "chat, vision");
    expect(isFeatureEnabled("chat")).toBe(false);
    expect(isFeatureEnabled("vision")).toBe(false);
    expect((await chat(request("chat", {}))).status).toBe(404);
    expect((await vision(request("vision", {}))).status).toBe(404);
  });
  it("requires explicit live enablement and credentials", async () => {
    vi.stubEnv("ENABLE_LIVE_AI", "false");
    vi.stubEnv("ANTHROPIC_API_KEY", "configured-for-test");
    expect(() => getProvider("live")).toThrow("not configured");
    const response = await voice(request("voice", { mode: "live", prompt: "Hi" }));
    expect(response.status).toBe(503);
    expect((await response.json()).error).toContain("Demo Mode");
  });
  it("never exposes a key in provider status or transport errors", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "private-test-value");
    vi.stubEnv("ENABLE_LIVE_AI", "true");
    const response = await status();
    const text = await response.text();
    expect(text).not.toContain("private-test-value");
    expect(JSON.parse(text).live).toBe(true);
    expect(publicError(new Error("private-test-value")).message).not.toContain(
      "private-test-value",
    );
  });
  it("rejects image signature mismatch", async () => {
    const response = await vision(
      request("vision", {
        prompt: "Look",
        image: { data: Buffer.from("not-an-image").toString("base64"), mediaType: "image/png" },
      }),
    );
    expect(response.status).toBe(400);
  });
  it("limits request bursts", async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 65 }, () =>
        readRequest(
          request("chat", { messages: [{ role: "user", content: "hi" }] }),
          chatSchema,
          "chat",
        ),
      ),
    );
    expect(
      results.some((result) => result.status === "rejected" && result.reason.status === 429),
    ).toBe(true);
  });
});
