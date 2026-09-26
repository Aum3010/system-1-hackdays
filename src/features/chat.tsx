"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Download, Plus, MessageSquare, Square, UserRound } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorNotice,
  PageHeader,
  ResultText,
  Spinner,
  Textarea,
} from "@/components/ui";
import { useWorkspace, type ChatMessage } from "@/lib/workspace";
import { consumeChatStream, downloadJSON } from "@/lib/client-api";
import { startTimer } from "@/lib/utils";

const starters = [
  "Help me shape a hackathon idea",
  "How should I structure my MVP?",
  "Create a plan for a research assistant",
];
export function Chat() {
  const { messages, setMessages, mode, track, ready } = useWorkspace();
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => () => abort.current?.abort(), []);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [messages]);
  async function send(text = prompt) {
    if (!text.trim() || busy || !ready) return;
    const conversation: ChatMessage[] = [...messages, { role: "user", content: text.trim() }];
    setMessages(conversation);
    setPrompt("");
    setError(null);
    setBusy(true);
    const controller = new AbortController();
    abort.current = controller;
    const elapsed = startTimer();
    let output = "";
    let success = false;
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          messages: conversation
            .slice(-30)
            .map((message) => ({ ...message, content: message.content.slice(0, 10000) })),
        }),
        signal: controller.signal,
      });
      await consumeChatStream(response, (part) => {
        output += part;
        setMessages([...conversation, { role: "assistant", content: output }]);
      });
      success = true;
    } catch (cause) {
      setError(
        controller.signal.aborted
          ? "Response stopped. You can send another message."
          : cause instanceof Error
            ? cause.message
            : "Unable to send message.",
      );
    } finally {
      setBusy(false);
      track({ feature: "chat", label: "Chat conversation", mode, durationMs: elapsed(), success });
    }
  }
  return (
    <>
      <PageHeader
        eyebrow="Core module / 01"
        title="Chat"
        description="A simple conversation, with streaming responses and saved history."
        action={
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Export conversation"
              disabled={!messages.length || busy}
              onClick={() => downloadJSON("launchpad-conversation.json", messages)}
            >
              <Download className="size-4" />
            </Button>
            <Button
              variant="secondary"
              disabled={busy || !ready}
              onClick={() => {
                setMessages([]);
                setError(null);
              }}
            >
              <Plus className="size-4" />
              New chat
            </Button>
          </div>
        }
      />
      <Card className="mx-auto flex min-h-[560px] max-w-3xl flex-col">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <span className="flex items-center gap-2 text-xs">
            <MessageSquare className="size-3.5 text-primary" />
            Launchpad assistant
          </span>
          <Badge>{mode === "demo" ? "Demo · Sample responses" : "Live · Anthropic"}</Badge>
        </div>
        <div
          className="max-h-[60vh] min-h-96 flex-1 overflow-y-auto p-5 sm:p-7"
          aria-live="polite"
          aria-relevant="additions text"
        >
          {!messages.length ? (
            <EmptyState
              title="Start a conversation"
              description="Write a message below or try one of these examples."
            >
              <div className="flex flex-col items-center gap-1">
                {starters.map((starter) => (
                  <Button
                    key={starter}
                    variant="ghost"
                    size="sm"
                    disabled={!ready}
                    onClick={() => void send(starter)}
                  >
                    {starter}
                  </Button>
                ))}
              </div>
            </EmptyState>
          ) : (
            <div className="space-y-7">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${message.role === "user" ? "ml-auto max-w-[90%] flex-row-reverse" : "max-w-[95%]"}`}
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    {message.role === "user" ? (
                      <UserRound className="size-4" />
                    ) : (
                      <MessageSquare className="size-4 text-primary" />
                    )}
                  </span>
                  <div
                    className={
                      message.role === "user" ? "rounded-2xl bg-muted/70 px-5 py-3" : "pt-1"
                    }
                  >
                    <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                      {message.role === "user" ? "You" : "Assistant"}
                    </p>
                    <ResultText>{message.content}</ResultText>
                  </div>
                </div>
              ))}
              {busy && <Spinner label="Composing response…" />}
              <div ref={end} />
            </div>
          )}
        </div>
        <form
          className="space-y-3 border-t border-border p-4 sm:p-5"
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
        >
          <ErrorNotice message={error} />
          <div className="relative">
            <Textarea
              aria-label="Message"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Write a message…"
              className="min-h-24 resize-none pr-16"
              maxLength={4000}
              disabled={busy || !ready}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  void send();
                }
              }}
            />
            {busy ? (
              <Button
                type="button"
                size="icon"
                className="absolute bottom-3 right-3"
                aria-label="Stop response"
                onClick={() => abort.current?.abort()}
              >
                <Square className="size-3.5" />
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon"
                className="absolute bottom-3 right-3"
                disabled={!prompt.trim() || !ready}
                aria-label="Send message"
              >
                <ArrowUp className="size-4" />
              </Button>
            )}
          </div>
          <div className="flex flex-wrap justify-between gap-2 text-[10px] text-muted-foreground">
            <span>
              {mode === "demo"
                ? "Deterministic demo · No data sent to an AI provider"
                : "Messages are sent to your configured AI provider"}
            </span>
            <span>Enter to send · Shift + Enter for newline</span>
          </div>
        </form>
      </Card>
    </>
  );
}
