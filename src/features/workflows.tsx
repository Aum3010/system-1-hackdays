"use client";
import { useState } from "react";
import { ArrowDown, Play } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Spinner,
  Textarea,
} from "@/components/ui";
import { RunTrace } from "@/components/run-trace";
import { workflowTemplates, type RunResult } from "@/lib/runners";
import { useTask } from "@/hooks/use-task";
import { useWorkspace } from "@/lib/workspace";

export function Workflows() {
  const { ready } = useWorkspace();
  const [templateId, setTemplateId] = useState<"idea-to-pitch" | "review-and-improve">(
    "idea-to-pitch",
  );
  const [input, setInput] = useState("");
  const task = useTask<RunResult>("workflows", "Workflow execution");
  const template = workflowTemplates.find((item) => item.id === templateId)!;
  return (
    <>
      <PageHeader
        eyebrow="More modules / 03"
        title="Workflows"
        description="Run a sequence of prompts and inspect each step along the way."
        action={<Badge>Sequential execution</Badge>}
      />
      <div className="mb-10 grid gap-6 sm:grid-cols-2">
        {workflowTemplates.map((item) => (
          <button
            key={item.id}
            disabled={task.busy}
            onClick={() => {
              setTemplateId(item.id);
              task.clear();
            }}
            aria-pressed={item.id === templateId}
            className={`border-b-2 px-1 pb-5 text-left transition-colors disabled:opacity-50 ${item.id === templateId ? "border-primary" : "border-border text-muted-foreground hover:border-input"}`}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium">{item.name}</h2>
              <Badge>{item.steps.length} steps</Badge>
            </div>
            <p className="mt-2 text-xs leading-6 text-muted-foreground">{item.description}</p>
          </button>
        ))}
      </div>
      <div className="grid items-start gap-12 xl:grid-cols-[.8fr_1.2fr]">
        <Card className="space-y-5 p-6">
          <label className="block text-xs font-medium">
            Your starting point
            <Textarea
              className="mt-2 min-h-36"
              value={input}
              maxLength={4000}
              disabled={task.busy}
              onChange={(event) => setInput(event.target.value)}
              placeholder="An assistant that turns a small team’s research notes into a searchable knowledge base…"
            />
          </label>
          <div className="border-l border-border py-2 pl-5">
            {template.steps.map((step, index) => (
              <div key={step}>
                {index > 0 && <ArrowDown className="my-2 ml-2 size-3 text-muted-foreground" />}
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex size-6 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    {index + 1}
                  </span>
                  {step}
                </div>
              </div>
            ))}
          </div>
          <ErrorNotice message={task.error} />
          <div className="flex gap-2">
            <Button
              disabled={!input.trim() || task.busy || !ready}
              onClick={() => void task.run({ template: templateId, input })}
            >
              <Play className="size-4" />
              Run workflow
            </Button>
            {task.busy && (
              <Button variant="secondary" onClick={task.cancel}>
                Stop
              </Button>
            )}
          </div>
          <p className="text-[11px] leading-5 text-muted-foreground">
            Each step receives the original input and previous output. Live workflows make up to
            three provider requests.
          </p>
        </Card>
        <div>
          {task.busy ? (
            <Card className="flex min-h-64 flex-col items-center justify-center gap-3 p-6">
              <Spinner label={`Running ${template.steps.length} connected steps…`} />
              <p className="text-xs text-muted-foreground">
                The complete trace appears when execution finishes.
              </p>
            </Card>
          ) : task.result ? (
            <RunTrace result={task.result} />
          ) : (
            <Card>
              <EmptyState
                title="Workflow results"
                description="Pick a template, add your starting idea, and inspect the output of every step."
              />
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
