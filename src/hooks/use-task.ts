"use client";
import { useEffect, useRef, useState } from "react";
import { postJSON } from "@/lib/client-api";
import { useWorkspace } from "@/lib/workspace";

export function useTask<T>(feature: string, label: string) {
  const { mode, track } = useWorkspace();
  const [result, setResult] = useState<T | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function run(body: Record<string, unknown>) {
    if (controller.current) return;
    const abort = new AbortController();
    controller.current = abort;
    setBusy(true);
    setError(null);
    setResult(null);
    const started = performance.now();
    let success = false;
    try {
      const data = await postJSON<T>(`/api/${feature}`, { ...body, mode }, abort.signal);
      setResult(data);
      success = !(data && typeof data === "object" && "success" in data && data.success === false);
    } catch (cause) {
      setError(
        abort.signal.aborted
          ? "Run stopped. You can adjust the input and try again."
          : cause instanceof Error
            ? cause.message
            : "Request failed.",
      );
    } finally {
      controller.current = null;
      setBusy(false);
      track({ feature, label, mode, durationMs: Math.round(performance.now() - started), success });
    }
  }
  return {
    result,
    busy,
    error,
    run,
    cancel: () => controller.current?.abort(),
    clear: () => {
      setResult(null);
      setError(null);
    },
  };
}
