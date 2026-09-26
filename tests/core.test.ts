import { describe, expect, it } from "vitest";
import { calculate, executeTool } from "@/lib/tools";
import { chunkText, extractiveAnswer, retrieve, sampleDocument } from "@/lib/knowledge";
import { demoProvider } from "@/lib/ai/demo";
import { runAgent, runWorkflow } from "@/lib/runners";
import { agentSchema, chatSchema, documentsSchema, visionSchema } from "@/lib/schemas";
import { hasImageSignature } from "@/lib/image-validation";
import { consumeChatStream } from "@/lib/client-api";
import { createWorkspaceStore, parseWorkspace } from "@/lib/workspace";
import { dailyActivity, summarizeActivity } from "@/lib/analytics";

describe("safe calculator", () => {
  it.each([
    ["(125 * 4) + 80", 580],
    ["2 + 3 * 4", 14],
    ["-3 * (2 + 1)", -9],
    [".5 + 1.25", 1.75],
    ["17 % 5", 2],
    ["10 / -2", -5],
  ])("evaluates %s", (input, expected) => expect(calculate(input)).toBe(expected));
  it.each([
    "1/0",
    "2%0",
    "alert(1)",
    "process.exit()",
    "2(3)",
    "1..2",
    "(1+2",
    "",
    "2+",
    "1".repeat(201),
  ])("rejects unsafe or invalid input %s", (input) => expect(() => calculate(input)).toThrow());
  it("runs the calculator tool with a natural prefix", () =>
    expect(executeTool("calculator", "Calculate 12 * 3", [])).toBe("12 * 3 = 36"));
  it("computes actual text statistics", () =>
    expect(executeTool("text_stats", "one two three", [])).toContain("3 words"));
});
describe("lexical retrieval", () => {
  it("creates bounded overlapping chunks without losing the tail", () => {
    const words = Array.from({ length: 250 }, (_, index) => `word${index}`);
    const chunks = chunkText(words.join(" "));
    expect(chunks).toHaveLength(3);
    expect(chunks[0].split(" ")).toHaveLength(120);
    expect(chunks[1].startsWith("word95 ")).toBe(true);
    expect(chunks.at(-1)).toContain("word249");
  });
  it("rejects a chunk overlap that would prevent progress", () =>
    expect(() => chunkText("test", 10, 10)).toThrow());
  it("ranks relevant sources and preserves citations", () => {
    const sources = retrieve("credentials", [
      sampleDocument,
      { id: "other", title: "Gardening", content: "Seeds need water and sunshine." },
    ]);
    expect(sources.length).toBeGreaterThan(0);
    expect(sources[0].documentId).toBe(sampleDocument.id);
    expect(extractiveAnswer(sources)).toContain("[1]");
  });
  it("does not invent answers with no matches", () => {
    expect(retrieve("quantum zebras", [sampleDocument])).toEqual([]);
    expect(extractiveAnswer([])).toContain("couldn’t find");
  });
  it("ignores empty and stop-word-only queries", () =>
    expect(retrieve("how is the", [sampleDocument])).toEqual([]));
});
describe("bounded runners", () => {
  it("deduplicates tools and includes real results", async () => {
    const result = await runAgent(
      { goal: "2+3", tools: ["calculator", "calculator", "text_stats"], documents: [] },
      demoProvider,
    );
    expect(result.success).toBe(true);
    expect(result.steps).toHaveLength(3);
    expect(result.steps[0].output).toBe("2+3 = 5");
    expect(result.provider).toBe("demo");
  });
  it("stops after a tool failure", async () => {
    const result = await runAgent(
      { goal: "1/0", tools: ["calculator", "text_stats"], documents: [] },
      demoProvider,
    );
    expect(result.success).toBe(false);
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0].status).toBe("failed");
  });
  it("passes earlier output to later workflow steps", async () => {
    const inputs: string[] = [];
    const provider = {
      ...demoProvider,
      complete: async (input: Parameters<typeof demoProvider.complete>[0]) => {
        inputs.push(input.messages[0].content);
        return `output-${inputs.length}`;
      },
    };
    const result = await runWorkflow(
      { template: "idea-to-pitch", input: "A research assistant" },
      provider,
    );
    expect(result.steps).toHaveLength(3);
    expect(inputs[1]).toContain("output-1");
    expect(inputs[2]).toContain("output-2");
    expect(inputs[2]).toContain("A research assistant");
    expect(result.output).toBe("output-3");
  });
  it("runs the two-step template", async () =>
    expect(
      (await runWorkflow({ template: "review-and-improve", input: "Improve notes" }, demoProvider))
        .steps,
    ).toHaveLength(2));
  it("honors cancellation before tool execution", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      runAgent(
        { goal: "2+2", tools: ["calculator"], documents: [] },
        demoProvider,
        controller.signal,
      ),
    ).rejects.toThrow();
  });
});
describe("request schemas and image limits", () => {
  it("defaults to credential-free demo", () =>
    expect(chatSchema.parse({ messages: [{ role: "user", content: "Hi" }] }).mode).toBe("demo"));
  it("rejects blank prompts, wrong roles, oversized history and unknown tools", () => {
    expect(chatSchema.safeParse({ messages: [{ role: "user", content: " " }] }).success).toBe(
      false,
    );
    expect(chatSchema.safeParse({ messages: [{ role: "assistant", content: "Hi" }] }).success).toBe(
      false,
    );
    expect(
      chatSchema.safeParse({
        messages: Array.from({ length: 31 }, () => ({ role: "user", content: "Hi" })),
      }).success,
    ).toBe(false);
    expect(agentSchema.safeParse({ goal: "test", tools: ["shell"] }).success).toBe(false);
  });
  it("rejects oversized source collections and text", () => {
    expect(documentsSchema.safeParse(Array(21).fill(sampleDocument)).success).toBe(false);
    expect(
      documentsSchema.safeParse([{ ...sampleDocument, content: "x".repeat(30001) }]).success,
    ).toBe(false);
  });
  it("checks signature independently of claimed MIME type", () => {
    const data = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).toString("base64");
    expect(hasImageSignature({ data, mediaType: "image/png" })).toBe(true);
    expect(hasImageSignature({ data, mediaType: "image/jpeg" })).toBe(false);
    expect(
      visionSchema.safeParse({
        prompt: "describe",
        image: { mediaType: "image/svg+xml", data: "abcd" },
      }).success,
    ).toBe(false);
  });
});
describe("stream consumer", () => {
  function response(content: string) {
    const encoded = new TextEncoder().encode(content);
    return new Response(
      new ReadableStream({
        start(controller) {
          for (const byte of encoded) controller.enqueue(new Uint8Array([byte]));
          controller.close();
        },
      }),
    );
  }
  it("handles fragmented UTF-8 and NDJSON records", async () => {
    let output = "";
    await consumeChatStream(
      response('{"type":"text","text":"Hello 🌱"}\n{"type":"done","provider":"demo"}\n'),
      (part) => {
        output += part;
      },
    );
    expect(output).toBe("Hello 🌱");
  });
  it("detects an incomplete stream", async () =>
    await expect(
      consumeChatStream(response('{"type":"text","text":"partial"}\n'), () => undefined),
    ).rejects.toThrow("interrupted"));
  it("surfaces a provider stream error", async () =>
    await expect(
      consumeChatStream(
        response('{"type":"error","message":"Provider unavailable"}\n'),
        () => undefined,
      ),
    ).rejects.toThrow("Provider unavailable"));
  it("streams the exact complete demo response", async () => {
    const input = { messages: [{ role: "user" as const, content: "Plan my MVP" }] };
    let output = "";
    for await (const part of demoProvider.stream(input)) output += part;
    expect(output).toBe(await demoProvider.complete(input));
  });
});
describe("workspace and analytics", () => {
  it("starts with an empty demo workspace", () => {
    const data = parseWorkspace(null);
    expect(data.mode).toBe("demo");
    expect(data.activity).toEqual([]);
    expect(data.documents).toEqual([]);
  });
  it("rejects corrupt or incompatible storage", () => {
    expect(() => parseWorkspace("invalid")).toThrow();
    expect(() => parseWorkspace('{"version":2}')).toThrow();
  });
  it("round-trips validated local data", () => {
    const data = { ...parseWorkspace(null), documents: [sampleDocument] };
    expect(parseWorkspace(JSON.stringify(data))).toEqual(data);
  });
  it("preserves unreadable storage until an explicit reset", () => {
    let saved = "corrupt";
    const store = createWorkspaceStore({
      getItem: () => saved,
      setItem: (_key, value) => {
        saved = value;
      },
    });
    const unsubscribe = store.subscribe(() => undefined);
    store.actions.addDocument(sampleDocument);
    expect(saved).toBe("corrupt");
    expect(store.getSnapshot().documents).toHaveLength(1);
    expect(store.getSnapshot().storageError).toContain("preserved");
    store.actions.reset();
    expect(JSON.parse(saved).documents).toEqual([]);
    expect(store.getSnapshot().storageError).toBeNull();
    unsubscribe();
  });
  it("retains in-memory updates when storage quota fails", () => {
    const store = createWorkspaceStore({
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
    });
    store.subscribe(() => undefined);
    store.actions.addDocument(sampleDocument);
    expect(store.getSnapshot().documents).toHaveLength(1);
    expect(store.getSnapshot().storageError).toContain("session");
  });
  it("bounds persisted conversation and activity history", () => {
    let saved = "";
    const store = createWorkspaceStore({
      getItem: () => null,
      setItem: (_key, value) => {
        saved = value;
      },
    });
    store.subscribe(() => undefined);
    store.actions.setMessages(
      Array.from({ length: 110 }, (_, index) => ({ role: "user", content: String(index) })),
    );
    for (let index = 0; index < 205; index++)
      store.actions.track({
        feature: "chat",
        label: "Chat",
        durationMs: 1,
        success: true,
        mode: "demo",
      });
    expect(parseWorkspace(saved).messages).toHaveLength(100);
    expect(parseWorkspace(saved).activity).toHaveLength(200);
  });
  it("uses actual events and separates days", () => {
    const activity = [
      {
        id: "1",
        feature: "chat",
        label: "Chat",
        mode: "demo" as const,
        durationMs: 100,
        success: true,
        createdAt: "2026-09-15T12:00:00.000Z",
      },
      {
        id: "2",
        feature: "chat",
        label: "Chat",
        mode: "live" as const,
        durationMs: 300,
        success: false,
        createdAt: "2026-09-14T12:00:00.000Z",
      },
    ];
    expect(summarizeActivity(activity)).toEqual({
      total: 2,
      successRate: 50,
      averageMs: 200,
      demoRuns: 1,
    });
    expect(
      dailyActivity(activity, new Date("2026-09-15T16:00:00Z")).reduce(
        (sum, day) => sum + day.count,
        0,
      ),
    ).toBe(2);
    expect(summarizeActivity([]).averageMs).toBe(0);
  });
});
