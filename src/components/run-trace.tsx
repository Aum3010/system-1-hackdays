"use client";

import { Check, CircleX, Download } from "lucide-react";
import { Badge, Button, Card, ResultText } from "@/components/ui";
import type { RunResult } from "@/lib/runners";
import { downloadJSON } from "@/lib/client-api";

export function RunTrace({ result }: { result: RunResult }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Execution trace</span>
        <div className="flex gap-2">
          <Badge>{result.provider}</Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => downloadJSON("launchpad-run.json", result)}
          >
            <Download className="size-3" />
            Export
          </Button>
        </div>
      </div>
      {result.steps.map((step, index) => (
        <Card key={step.id} className="result-enter overflow-hidden border-b border-border">
          <details open={index === result.steps.length - 1}>
            <summary className="flex cursor-pointer items-center gap-3 p-4 text-sm">
              <span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs">
                {index + 1}
              </span>
              {step.name}
              <span className="ml-auto text-[10px] text-muted-foreground">
                {step.durationMs} ms
              </span>
              {step.status === "completed" ? (
                <Check className="size-4 text-primary" />
              ) : (
                <CircleX className="size-4 text-destructive" />
              )}
            </summary>
            <div className="border-t border-border p-4">
              <ResultText>{step.output}</ResultText>
            </div>
          </details>
        </Card>
      ))}
      {!result.success && (
        <p role="alert" className="text-sm text-destructive">
          {result.output}
        </p>
      )}
    </div>
  );
}
