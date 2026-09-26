"use client";
import { useState } from "react";
import { Download } from "lucide-react";
import { Badge, Button, Card, EmptyState, PageHeader, Select } from "@/components/ui";
import { useWorkspace } from "@/lib/workspace";
import { dailyActivity, summarizeActivity } from "@/lib/analytics";
import { formatDate } from "@/lib/utils";
import { downloadJSON } from "@/lib/client-api";

export function Analytics() {
  const { activity } = useWorkspace();
  const [filter, setFilter] = useState("all");
  const events = activity.filter((event) => filter === "all" || event.mode === filter);
  const stats = summarizeActivity(events);
  const days = dailyActivity(events);
  const max = Math.max(1, ...days.map((day) => day.count));
  return (
    <>
      <PageHeader
        eyebrow="Workspace / Insights"
        title="Activity"
        description="Runs, outcomes, and durations from this browser’s workspace."
        action={
          <Button
            variant="secondary"
            disabled={!events.length}
            onClick={() => downloadJSON("launchpad-activity.json", events)}
          >
            <Download className="size-4" />
            Export activity
          </Button>
        }
      />
      <div className="mb-5 flex items-center justify-between">
        <Badge>Last 200 runs · This browser</Badge>
        <Select
          aria-label="Filter activity by mode"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        >
          <option value="all">All modes</option>
          <option value="demo">Demo only</option>
          <option value="live">Live only</option>
        </Select>
      </div>
      <div className="mb-12 grid grid-cols-2 gap-6 border-y border-border py-4 lg:grid-cols-4">
        {[
          { label: "Total runs", value: stats.total },
          { label: "Success rate", value: `${stats.successRate}%` },
          { label: "Average duration", value: `${(stats.averageMs / 1000).toFixed(2)}s` },
          { label: "Demo runs", value: stats.demoRuns },
        ].map((stat) => (
          <Card key={stat.label} className="p-5">
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className="mt-3 text-3xl font-medium tracking-tight">{stat.value}</p>
          </Card>
        ))}
      </div>
      <Card className="mb-6 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Activity over time</h2>
          <span className="text-xs text-muted-foreground">Past 7 days · Local time</span>
        </div>
        <div
          className="mt-7 flex h-44 items-end gap-4"
          role="img"
          aria-label={days.map((day) => `${day.label}: ${day.count} runs`).join(", ")}
        >
          {days.map((day, index) => (
            <div key={index} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
              <span className="font-mono text-[10px] text-muted-foreground">{day.count}</span>
              <div
                className={`bar-enter w-full max-w-10 rounded-t-sm ${day.count ? "bg-primary/65" : "bg-muted"}`}
                style={{ height: `${Math.max(2, (day.count / max) * 110)}px` }}
              />
              <span className="text-[10px] text-muted-foreground">{day.label}</span>
            </div>
          ))}
        </div>
      </Card>
      <Card className="overflow-hidden">
        <h2 className="border-b border-border p-5 text-sm font-medium">Run history</h2>
        {events.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/20 text-muted-foreground">
                <tr>
                  {["Activity", "Mode", "Status", "Duration", "When"].map((heading) => (
                    <th key={heading} scope="col" className="px-5 py-3 font-medium">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {events.map((event) => (
                  <tr key={event.id}>
                    <td className="whitespace-nowrap px-5 py-4">{event.label}</td>
                    <td className="px-5 py-4">
                      <Badge>{event.mode}</Badge>
                    </td>
                    <td className="px-5 py-4">
                      <span className={event.success ? "text-primary" : "text-destructive"}>
                        {event.success ? "Completed" : "Failed / stopped"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 font-mono text-muted-foreground">
                      {event.durationMs} ms
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-muted-foreground">
                      {formatDate(event.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No activity yet"
            description="Use chat, agents, knowledge, vision, voice, or workflows to record activity. No analytics are sent to an external service."
          />
        )}
      </Card>
      <p className="mt-4 text-[11px] text-muted-foreground">
        Durations are measured in your browser. Token usage and provider costs are not estimated.
      </p>
    </>
  );
}
