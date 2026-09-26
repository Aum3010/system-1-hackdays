export type Message = { role: "user" | "assistant"; content: string };
export type ImageInput = {
  data: string;
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
};
export type GenerateInput = {
  messages: Message[];
  system?: string;
  image?: ImageInput;
  signal?: AbortSignal;
};
export interface AIProvider {
  id: "demo" | "anthropic";
  model: string;
  complete(input: GenerateInput): Promise<string>;
  stream(input: GenerateInput): AsyncIterable<string>;
}
export type StreamEvent =
  | { type: "text"; text: string }
  | { type: "done"; provider: string }
  | { type: "error"; message: string };
