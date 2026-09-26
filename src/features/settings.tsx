"use client";
import { useEffect, useState } from "react";
import { Check, Download, RefreshCw, Settings2, ShieldCheck } from "lucide-react";
import { Badge, Button, Card, ErrorNotice, PageHeader, Spinner } from "@/components/ui";
import { useWorkspace } from "@/lib/workspace";
import { features, isFeatureEnabled } from "@/config/features";
import { downloadJSON } from "@/lib/client-api";

type Status = { live: boolean; provider: string; model: string };
async function readStatus(signal?: AbortSignal): Promise<Status> {
  const response = await fetch("/api/status", { signal });
  if (!response.ok) throw new Error("Unable to check server configuration.");
  return response.json();
}
export function Settings() {
  const workspace = useWorkspace();
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [confirmReset, setConfirmReset] = useState(false);
  async function checkStatus(signal?: AbortSignal) {
    setChecking(true);
    setError(null);
    try {
      setStatus(await readStatus(signal));
    } catch (cause) {
      if (!signal?.aborted)
        setError(cause instanceof Error ? cause.message : "Status check failed.");
    } finally {
      if (!signal?.aborted) setChecking(false);
    }
  }
  useEffect(() => {
    const abort = new AbortController();
    void readStatus(abort.signal)
      .then((data) => {
        if (!abort.signal.aborted) setStatus(data);
      })
      .catch((cause: unknown) => {
        if (!abort.signal.aborted)
          setError(cause instanceof Error ? cause.message : "Status check failed.");
      })
      .finally(() => {
        if (!abort.signal.aborted) setChecking(false);
      });
    return () => abort.abort();
  }, []);
  return (
    <>
      <PageHeader
        eyebrow="Workspace / Configuration"
        title="Settings"
        description="Choose how you work, see what’s connected, and manage your local data."
        action={<Settings2 className="size-5 text-muted-foreground" />}
      />
      <div className="max-w-4xl space-y-8 divide-y divide-border">
        <Card className="p-6">
          <h2 className="font-medium">AI mode</h2>
          <p className="mt-2 text-xs leading-6 text-muted-foreground">
            Demo Mode is ready out of the box. Live Mode uses the credentials configured on your
            server.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              {
                mode: "demo" as const,
                title: "Demo Mode",
                description: "Deterministic examples. Real local tools. No API key.",
              },
              {
                mode: "live" as const,
                title: "Live Mode",
                description: "Provider-generated responses. API usage may incur costs.",
              },
            ].map((option) => (
              <button
                key={option.mode}
                disabled={
                  !workspace.ready || (option.mode === "live" && (!status?.live || checking))
                }
                aria-pressed={workspace.mode === option.mode}
                onClick={() => workspace.setMode(option.mode)}
                className={`border-b-2 px-1 py-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${workspace.mode === option.mode ? "border-primary" : "border-border"}`}
              >
                <div className="flex items-center justify-between text-sm">
                  {option.title}
                  {workspace.mode === option.mode && <Check className="size-4 text-primary" />}
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{option.description}</p>
              </button>
            ))}
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Provider connection</h2>
            <Button
              variant="ghost"
              size="sm"
              disabled={checking}
              onClick={() => void checkStatus()}
            >
              <RefreshCw className="size-3" />
              Recheck
            </Button>
          </div>
          <div className="my-4">
            {checking ? (
              <Spinner label="Checking server configuration…" />
            ) : (
              status && (
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <Badge className={status.live ? "text-primary" : ""}>
                    {status.live ? "Configured" : "Demo only"}
                  </Badge>
                  <span className="text-muted-foreground">Anthropic · {status.model}</span>
                </div>
              )
            )}
          </div>
          <ErrorNotice message={error} />
          <p className="text-xs leading-6 text-muted-foreground">
            To enable live requests, copy <code className="text-foreground">.env.example</code> to{" "}
            <code className="text-foreground">.env.local</code>, set{" "}
            <code className="text-foreground">ANTHROPIC_API_KEY</code> and{" "}
            <code className="text-foreground">ENABLE_LIVE_AI=true</code>, then restart the server.
            This checks configuration only; it does not make a billable test call.
          </p>
          <p className="mt-4 flex items-center gap-2 text-xs text-primary">
            <ShieldCheck className="size-4" />
            Credentials remain on the server.
          </p>
        </Card>
        <Card className="p-6">
          <h2 className="font-medium">Feature modules</h2>
          <p className="mt-2 text-xs leading-6 text-muted-foreground">
            Set NEXT_PUBLIC_DISABLED_FEATURES in your environment and restart or rebuild to change
            availability.
          </p>
          <div className="mt-4 divide-y divide-border">
            {features.map((feature) => (
              <div key={feature.id} className="flex items-center justify-between py-3 text-sm">
                <span>{feature.name}</span>
                <Badge className={isFeatureEnabled(feature.id) ? "text-primary" : ""}>
                  {isFeatureEnabled(feature.id) ? "Enabled" : "Disabled"}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-6">
          <h2 className="font-medium">Workspace data</h2>
          <p className="mb-5 mt-2 text-xs leading-6 text-muted-foreground">
            Conversations, source documents, and the last 200 run events are saved in this browser.
            Export a copy before clearing data. Uploaded images and audio are not saved.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              disabled={!workspace.ready}
              onClick={() =>
                downloadJSON("launchpad-workspace.json", {
                  version: 1,
                  mode: workspace.mode,
                  messages: workspace.messages,
                  documents: workspace.documents,
                  activity: workspace.activity,
                })
              }
            >
              <Download className="size-4" />
              Export workspace
            </Button>
            <Button
              variant="destructive"
              disabled={!workspace.ready}
              onClick={() => setConfirmReset(true)}
            >
              Reset workspace
            </Button>
          </div>
          {confirmReset && (
            <div className="mt-4 rounded-lg border border-destructive/20 p-4">
              <p className="mb-3 text-xs leading-6">
                This removes saved conversations, sources and activity from this browser. Export
                first if you need to keep them.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    workspace.reset();
                    setConfirmReset(false);
                  }}
                >
                  Confirm reset
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setConfirmReset(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
