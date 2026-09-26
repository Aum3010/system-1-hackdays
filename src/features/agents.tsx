"use client";
import { Play, Square } from "lucide-react";
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
import { toolDefinitions, type ToolId } from "@/lib/tools";
import type { RunResult } from "@/lib/runners";
import { useWorkspace } from "@/lib/workspace";
import { useTask } from "@/hooks/use-task";
import { useState } from "react";

export function Agents() {
  const { documents, ready } = useWorkspace();
  const [goal, setGoal] = useState("");
  const [tools, setTools] = useState<ToolId[]>(["text_stats"]);
  const task = useTask<RunResult>("agents", "Agent execution");
  return (
    <>
      <PageHeader
        eyebrow="Core module / 02"
        title="Agents & tools"
        description="Run a bounded sequence of tools, then turn their results into a next step."
        action={<Badge>Up to 3 tools per run</Badge>}
      />
      <div className="grid items-start gap-12 xl:grid-cols-[.85fr_1.15fr]">
        <Card className="space-y-5 p-6">
          <div>
            <h2 className="font-medium">Configure your agent</h2>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Selected tools run in order. Every output appears in the trace.
            </p>
          </div>
          <label className="block text-xs font-medium">
            Goal or tool input
            <Textarea
              className="mt-2"
              placeholder="Describe a goal, or enter an expression like (125 * 4) + 80"
              value={goal}
              maxLength={4000}
              disabled={task.busy}
              onChange={(event) => setGoal(event.target.value)}
            />
          </label>
          <fieldset disabled={task.busy}>
            <legend className="mb-3 text-xs font-medium">Available tools</legend>
            <div className="space-y-2">
              {toolDefinitions.map((tool) => (
                <label
                  key={tool.id}
                  className="flex cursor-pointer items-start gap-3 border-b border-border py-4 transition-colors hover:bg-muted/30"
                >
                  <input
                    type="checkbox"
                    className="mt-1 accent-primary"
                    checked={tools.includes(tool.id)}
                    onChange={(event) =>
                      setTools((previous) =>
                        event.target.checked
                          ? [...previous, tool.id]
                          : previous.filter((id) => id !== tool.id),
                      )
                    }
                  />
                  <span>
                    <span className="block text-sm">{tool.name}</span>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                      {tool.description}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <ErrorNotice message={task.error} />
          <div className="flex gap-2">
            <Button
              disabled={!goal.trim() || !tools.length || task.busy || !ready}
              onClick={() => void task.run({ goal, tools, documents })}
            >
              <Play className="size-4" />
              Run agent
            </Button>
            {task.busy && (
              <Button variant="secondary" onClick={task.cancel}>
                <Square className="size-3" />
                Stop
              </Button>
            )}
          </div>
          <p className="text-[11px] leading-5 text-muted-foreground">
            Tools run locally on the server. Live Mode sends the goal and tool outputs to the
            provider for synthesis.
          </p>
        </Card>
        <div>
          {task.busy ? (
            <Card className="flex min-h-64 items-center justify-center">
              <Spinner label="Executing tools and synthesizing results…" />
            </Card>
          ) : task.result ? (
            <RunTrace result={task.result} />
          ) : (
            <Card>
              <EmptyState
                title="Your execution trace"
                description="Choose tools and run a goal. You’ll get an inspectable execution trace, with real tool outputs in both Demo and Live Mode."
              />
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
