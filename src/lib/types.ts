// Shared data contracts have no React, Next.js, browser, or provider dependencies.
export type Mode = "demo" | "live";
export type ChatMessage = { role: "user" | "assistant"; content: string };
export type Document = { id: string; title: string; content: string };
export type Activity = {
  id: string;
  feature: string;
  label: string;
  mode: Mode;
  durationMs: number;
  success: boolean;
  createdAt: string;
};
