import { retrieve } from "./knowledge";
import type { Document } from "./types";
import type { toolIds } from "./schemas";

export type ToolId = (typeof toolIds)[number];
// Recursive descent arithmetic parser. Never evaluates JavaScript or arbitrary code.
export function calculate(expression: string): number {
  const compact = expression.replace(/\s/g, "");
  if (!compact || compact.length > 200 || /[^\d.+\-*/()%]/.test(compact))
    throw new Error("Use a numeric expression with +, -, *, /, %, and parentheses.");
  const tokens = compact.match(/\d*\.?\d+|[()+\-*/%]/g) ?? [];
  if (tokens.join("") !== compact) throw new Error("Invalid numeric expression.");
  let index = 0;
  function atom(): number {
    const token = tokens[index++];
    if (token === "+") return atom();
    if (token === "-") return -atom();
    if (token === "(") {
      const result = add();
      if (tokens[index++] !== ")") throw new Error("Unclosed parentheses.");
      return result;
    }
    if (!token || !/^(?:\d*\.)?\d+$/.test(token)) throw new Error("Expected a number.");
    return Number(token);
  }
  function multiply(): number {
    let result = atom();
    while (["*", "/", "%"].includes(tokens[index])) {
      const operator = tokens[index++];
      const right = atom();
      if ((operator === "/" || operator === "%") && right === 0)
        throw new Error("Cannot divide by zero.");
      result =
        operator === "*" ? result * right : operator === "/" ? result / right : result % right;
    }
    return result;
  }
  function add(): number {
    let result = multiply();
    while (["+", "-"].includes(tokens[index])) {
      const operator = tokens[index++];
      const right = multiply();
      result = operator === "+" ? result + right : result - right;
    }
    return result;
  }
  const result = add();
  if (index !== tokens.length || !Number.isFinite(result))
    throw new Error("Invalid or out-of-range expression.");
  return result;
}
export const toolDefinitions: { id: ToolId; name: string; description: string }[] = [
  {
    id: "knowledge_search",
    name: "Search knowledge",
    description: "Find matching passages in your saved documents.",
  },
  {
    id: "text_stats",
    name: "Analyze text",
    description: "Count words, characters, and estimated reading time.",
  },
  {
    id: "calculator",
    name: "Calculator",
    description: "Evaluate an expression, such as (125 * 4) + 80.",
  },
];
export function executeTool(id: ToolId, input: string, documents: Document[]): string {
  switch (id) {
    case "calculator": {
      const expression = input.replace(/^\s*(?:calculate|compute|evaluate)\s*:?\s*/i, "").trim();
      return `${expression} = ${calculate(expression)}`;
    }
    case "knowledge_search": {
      const sources = retrieve(input, documents);
      return sources.length
        ? sources
            .map((source, index) => `[${index + 1}] ${source.title}: ${source.text}`)
            .join("\n\n")
        : "No matching knowledge sources. Add documents or use more specific keywords.";
    }
    case "text_stats": {
      const words = input.trim().split(/\s+/).filter(Boolean).length;
      return `${words} words · ${input.length} characters · ${Math.max(1, Math.ceil(words / 200))} minute(s) estimated reading time`;
    }
  }
}
