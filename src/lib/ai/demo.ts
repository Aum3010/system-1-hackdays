import type { AIProvider, GenerateInput } from "./types";

export function demoAnswer(input: GenerateInput): string {
  const prompt = input.messages.at(-1)?.content ?? "your idea";
  const topic = prompt.replace(/\s+/g, " ").slice(0, 180);
  if (input.image)
    return (
      "DEMO VISION · Illustrative response\n\nThis is a sample analysis to demonstrate the image workflow. The uploaded image has not been interpreted by a model.\n\nA live analysis can describe visible objects, extract legible text, and suggest design improvements. Switch to Live Mode with a configured provider to analyze your actual image.\n\nYour question: " +
      topic
    );
  if (input.system?.includes("WORKFLOW:BRIEF"))
    return `PROJECT BRIEF · Demo draft\n\nIdea: ${topic}\n\nAudience: People who need a simpler way to complete this task.\nProblem: The current process requires too many disconnected steps.\nPrototype: One input, one useful AI-assisted action, and a clear result.\nSuccess signal: A first-time user can finish the core task in under two minutes.`;
  if (input.system?.includes("WORKFLOW:CRITIQUE"))
    return "REVIEW · Demo checklist\n\n1. Narrow the target audience and name their most frequent pain point.\n2. Use a measurable success signal; validate it with three people.\n3. Show a useful error state when the AI provider is unavailable.\n4. Separate sample data from live results.\n5. Keep the presentation centered on one complete user journey.";
  if (input.system?.includes("WORKFLOW:PITCH"))
    return `60-SECOND PITCH · Demo draft\n\nWe’re making a frustrating, multi-step task feel simple.\n\nThe product brings the input, AI assistance, and result into a single workspace. In the demo, we show one person completing one useful task from start to finish.\n\nNext, we’ll test that journey with three target users and measure time saved.\n\nStarting context: ${topic}`;
  if (input.system?.includes("AGENT_SYNTHESIS"))
    return `AGENT RESULT · Demo synthesis\n\nGoal: ${topic}\n\nThe selected tools have completed. Their exact outputs are visible in the execution trace. Use those outputs as evidence for your next step.\n\nSuggested next action: choose one measurable outcome, implement the smallest useful slice, and verify it with a real example.\n\nThis summary is a deterministic demo template; it is not model reasoning.`;
  if (/summari[sz]e|summary/i.test(prompt))
    return `DEMO SUMMARY\n\nTopic: ${topic}\n\n• Define the problem and who experiences it.\n• Choose the smallest end-to-end experience that solves it.\n• Verify the result with a concrete example.\n\nThis is an illustrative template. Use Knowledge for extractive answers from your own documents, or Live Mode for a model-generated summary.`;
  return `Let’s give your idea a practical starting point.\n\nYou asked: “${topic}”\n\n1. Pick one person and one problem. Write down what a successful outcome looks like for them.\n\n2. Build the shortest path to that outcome. Start with an input, a useful action, and a result someone can inspect.\n\n3. Connect a building block. Knowledge can answer from your notes; Agents can run tools; Workflows can turn an idea into a brief and pitch.\n\n4. Test the whole journey. Include the empty state, a successful run, and a clear recovery path.\n\nDemo Mode uses deterministic sample responses. Your conversation stays in this browser.`;
}
export const demoProvider: AIProvider = {
  id: "demo",
  model: "launchpad-demo-v1",
  async complete(input) {
    input.signal?.throwIfAborted();
    return demoAnswer(input);
  },
  async *stream(input) {
    for (const part of demoAnswer(input).match(/.{1,28}(?:\s|$)|.{1,28}/gs) ?? []) {
      input.signal?.throwIfAborted();
      yield part;
    }
  },
};
