import { z } from "zod";

export const modeSchema = z.enum(["demo", "live"]).default("demo");
export const promptSchema = z
  .string()
  .trim()
  .min(1, "Enter a prompt.")
  .max(4000, "Keep prompts under 4,000 characters.");
export const documentSchema = z.object({
  id: z.string().min(1).max(100),
  title: z.string().trim().min(1).max(100),
  content: z.string().trim().min(1).max(30000),
});
export const documentsSchema = z.array(documentSchema).max(20);
export const chatSchema = z
  .object({
    mode: modeSchema,
    messages: z
      .array(
        z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string().trim().min(1).max(10000),
        }),
      )
      .min(1)
      .max(30),
  })
  .refine((data) => data.messages.at(-1)?.role === "user", {
    message: "The last message must be from the user.",
  });
export const toolIds = ["calculator", "knowledge_search", "text_stats"] as const;
export const agentSchema = z.object({
  mode: modeSchema,
  goal: promptSchema,
  tools: z.array(z.enum(toolIds)).min(1).max(3),
  documents: documentsSchema.default([]),
});
export const knowledgeSchema = z.object({
  mode: modeSchema,
  query: promptSchema,
  documents: documentsSchema.min(1),
});
export const visionSchema = z.object({
  mode: modeSchema,
  prompt: promptSchema,
  image: z.object({
    mediaType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]),
    data: z
      .string()
      .min(4)
      .max(5600000)
      .regex(/^[A-Za-z0-9+/]+={0,2}$/, "Invalid image encoding."),
  }),
});
export const workflowSchema = z.object({
  mode: modeSchema,
  template: z.enum(["idea-to-pitch", "review-and-improve"]),
  input: promptSchema,
});
export const voiceSchema = z.object({ mode: modeSchema, prompt: promptSchema });
