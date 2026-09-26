import type { Document } from "@/lib/types";

export type Citation = {
  documentId: string;
  title: string;
  chunk: number;
  text: string;
  score: number;
};
const stopWords = new Set(
  "a an and are as at be by can do does for from how i in is it of on or our that the their this to was we what when where which who why will with you your".split(
    " ",
  ),
);
export function tokenize(value: string) {
  return (
    value
      .toLowerCase()
      .match(/[\p{L}\p{N}]{2,}/gu)
      ?.filter((word) => !stopWords.has(word)) ?? []
  );
}
export function chunkText(text: string, size = 120, overlap = 25): string[] {
  if (size < 1 || overlap < 0 || overlap >= size) throw new Error("Invalid chunk configuration.");
  const words = text.trim().split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  for (let index = 0; index < words.length; index += size - overlap) {
    chunks.push(words.slice(index, index + size).join(" "));
    if (index + size >= words.length) break;
  }
  return chunks;
}
export function retrieve(query: string, documents: Document[], limit = 4): Citation[] {
  const terms = [...new Set(tokenize(query))];
  if (!terms.length) return [];
  const candidates = documents.flatMap((document) =>
    chunkText(document.content).map((text, chunk) => {
      const tokens = tokenize(text);
      const titleTokens = tokenize(document.title);
      const score =
        terms.reduce(
          (total, term) =>
            total +
            (tokens.includes(term)
              ? 1 + Math.min(tokens.filter((token) => token === term).length, 3) / 10
              : 0) +
            (titleTokens.includes(term) ? 0.5 : 0),
          0,
        ) / terms.length;
      return { documentId: document.id, title: document.title, chunk, text, score };
    }),
  );
  return candidates
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
export function extractiveAnswer(citations: Citation[]) {
  if (!citations.length)
    return "I couldn’t find a matching passage in your documents. Try a specific keyword that appears in a source, or add another document.";
  return (
    "Here are the matching passages from your sources:\n\n" +
    citations.map((citation, index) => `[${index + 1}] ${citation.text}`).join("\n\n") +
    "\n\nDemo Mode returns source excerpts using lexical search. It does not generate or infer additional facts."
  );
}
export const sampleDocument: Document = {
  id: "sample-launch-guide",
  title: "Launchpad project guide",
  content:
    "Launchpad is an AI hackathon starter. Demo Mode works without API credentials and uses deterministic responses. The workspace includes chat, agents, knowledge, vision, voice, workflows and analytics.\n\nKnowledge documents stay in browser local storage. Text and Markdown files can be uploaded, with a maximum of 20 documents and 30,000 characters per document. Retrieval splits documents into overlapping chunks and ranks keyword matches. Answers include source citations. This baseline uses lexical retrieval, not a vector database.\n\nTo enable live AI, set ANTHROPIC_API_KEY and ENABLE_LIVE_AI=true in .env.local, restart the server, and choose Live Mode in Settings. Provider credentials never belong in browser storage.\n\nThe recommended hackathon plan is to define one user problem, build one complete journey, test failure recovery, and prepare a 60-second pitch. Keep the demo focused on a measurable outcome.",
};
