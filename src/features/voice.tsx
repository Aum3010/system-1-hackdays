"use client";
import { useEffect, useRef, useState } from "react";
import { AudioLines, Mic, Send, Square, Volume2 } from "lucide-react";
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
import { useTask } from "@/hooks/use-task";
import { useWorkspace } from "@/lib/workspace";
import type { Recognition, SpeechWindow } from "@/lib/speech";

export function Voice() {
  const { ready } = useWorkspace();
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const browser = (typeof window === "undefined" ? undefined : window) as SpeechWindow | undefined;
  const support = {
    recognition: ready && !!(browser?.SpeechRecognition || browser?.webkitSpeechRecognition),
    synthesis: ready && !!browser && "speechSynthesis" in browser,
  };
  const [error, setError] = useState<string | null>(null);
  const recognition = useRef<Recognition | null>(null);
  const task = useTask<{ output: string; provider: string }>("voice", "Voice assistant");
  useEffect(() => {
    return () => {
      recognition.current?.abort();
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);
  function startListening() {
    const browser = window as SpeechWindow;
    const Constructor = browser.SpeechRecognition || browser.webkitSpeechRecognition;
    if (!Constructor) return;
    setError(null);
    const session = new Constructor();
    recognition.current = session;
    session.lang = "en-US";
    session.continuous = false;
    session.interimResults = false;
    session.onresult = (event) => {
      let transcript = "";
      for (let index = event.resultIndex; index < event.results.length; index++)
        if (event.results[index].isFinal) transcript += event.results[index][0].transcript + " ";
      setText((previous) => (previous + " " + transcript).trim().slice(0, 4000));
    };
    session.onerror = (event) => {
      setError(`Microphone: ${event.error}. You can type your message below.`);
      setListening(false);
    };
    session.onend = () => setListening(false);
    try {
      session.start();
      setListening(true);
    } catch {
      setError("Microphone could not start. Check browser permissions or type below.");
    }
  }
  function speak() {
    if (!task.result || !support.synthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(task.result.output);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => {
      setSpeaking(false);
      setError("Speech playback was interrupted. The text is still available.");
    };
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }
  return (
    <>
      <PageHeader
        eyebrow="More modules / 02"
        title="Voice"
        description="Speak or type an idea. Get a response you can read or listen to."
        action={<Badge>Browser speech + text fallback</Badge>}
      />
      <div className="grid items-start gap-12 lg:grid-cols-2">
        <Card className="space-y-5 p-6">
          <div className="flex flex-col items-center py-12">
            <div
              className={`mb-6 flex size-24 items-center justify-center rounded-full bg-muted ${listening ? "animate-pulse" : ""}`}
            >
              <AudioLines className="size-8 text-primary" />
            </div>
            <p className="text-sm">{listening ? "Listening…" : "Speak when you’re ready."}</p>
            <div className="mt-5">
              {listening ? (
                <Button variant="secondary" onClick={() => recognition.current?.stop()}>
                  <Square className="size-3" />
                  Stop listening
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  disabled={!support.recognition || task.busy || speaking}
                  onClick={startListening}
                >
                  <Mic className="size-4" />
                  Start microphone
                </Button>
              )}
            </div>
          </div>
          <p className="text-[11px] leading-5 text-muted-foreground">
            {support.recognition
              ? "Microphone access is optional. Your browser’s speech service may process audio online, including in Demo Mode."
              : "Speech recognition is not available in this browser. The typed workflow below is fully supported."}
          </p>
          <label className="block text-xs font-medium">
            Your transcript or message
            <Textarea
              className="mt-2 min-h-32"
              value={text}
              maxLength={4000}
              onChange={(event) => setText(event.target.value)}
              disabled={task.busy || listening}
              placeholder="Type here, or use the microphone above…"
            />
          </label>
          <ErrorNotice message={error || task.error} />
          <div className="flex gap-2">
            <Button
              disabled={!text.trim() || task.busy || listening || !ready || speaking}
              onClick={() => void task.run({ prompt: text })}
            >
              <Send className="size-4" />
              Send message
            </Button>
            {task.busy && (
              <Button variant="secondary" onClick={task.cancel}>
                Stop
              </Button>
            )}
          </div>
        </Card>
        <Card className="p-6">
          {task.busy ? (
            <div className="flex min-h-64 items-center justify-center">
              <Spinner label="Preparing your response…" />
            </div>
          ) : task.result ? (
            <div>
              <div className="mb-5 flex items-center justify-between">
                <Badge>{task.result.provider}</Badge>
                {speaking ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      window.speechSynthesis.cancel();
                      setSpeaking(false);
                    }}
                  >
                    Stop playback
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!support.synthesis}
                    onClick={speak}
                  >
                    <Volume2 className="size-3.5" />
                    Read aloud
                  </Button>
                )}
              </div>
              <ResultText>{task.result.output}</ResultText>
              {!support.synthesis && (
                <p className="mt-4 text-xs text-muted-foreground">
                  Speech playback is unavailable in this browser.
                </p>
              )}
            </div>
          ) : (
            <EmptyState
              title="Your response"
              description="Review the transcript before sending. Audio is not recorded or saved by this application."
            />
          )}
        </Card>
      </div>
    </>
  );
}
