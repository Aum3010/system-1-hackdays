"use client";

import Link from "next/link";
import { ArrowRight, ArrowUpRight, Clock3 } from "lucide-react";
import { Badge, Button, PageHeader } from "@/components/ui";
import { enabledFeatures, isFeatureEnabled } from "@/config/features";
import { featureIcons } from "@/components/icons";
import { useWorkspace } from "@/lib/workspace";
import { formatDate } from "@/lib/utils";

export function Dashboard() {
  const { activity, documents, mode } = useWorkspace();
  const stats = [
    { label: "Modules available", value: enabledFeatures.length },
    { label: "Runs completed", value: activity.filter((event) => event.success).length },
    { label: "Knowledge sources", value: documents.length },
  ];
  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="A place to start."
        description="Choose a module, try it with your idea, and adapt it to your project."
        action={
          isFeatureEnabled("chat") && (
            <Button asChild>
              <Link href="/chat">
                Open chat <ArrowRight className="size-4" />
              </Link>
            </Button>
          )
        }
      />
      <dl className="mb-14 flex flex-wrap gap-x-12 gap-y-6 border-y border-border py-6 sm:gap-x-20">
        {stats.map((stat) => (
          <div key={stat.label}>
            <dt className="text-xs text-muted-foreground">{stat.label}</dt>
            <dd className="mt-2 text-2xl font-normal tabular-nums">
              {stat.value.toString().padStart(2, "0")}
            </dd>
          </div>
        ))}
      </dl>
      <section aria-labelledby="modules-heading">
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="modules-heading" className="text-base font-medium">
            Your modules
          </h2>
          <p className="text-xs text-muted-foreground">Explore each one independently.</p>
        </div>
        <div className="stagger-in">
          {enabledFeatures.map((feature, index) => {
            const Icon = featureIcons[feature.icon];
            return (
              <Link
                href={feature.href}
                key={feature.id}
                className="module-link group grid grid-cols-[1.5rem_1fr_auto] items-center gap-4 border-t border-border py-6 sm:grid-cols-[1.5rem_1.5rem_8rem_1fr_auto] sm:gap-5 sm:py-7 sm:hover:px-3"
              >
                <span className="font-mono text-[10px] text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <Icon strokeWidth={1.4} className="hidden size-5 text-muted-foreground sm:block" />
                <h3 className="text-sm font-medium">
                  {feature.name}
                  <span className="mt-1 block text-xs font-normal leading-6 text-muted-foreground sm:hidden">
                    {feature.description}
                  </span>
                </h3>
                <p className="hidden text-sm leading-6 text-muted-foreground sm:block">
                  {feature.description}
                </p>
                <ArrowUpRight
                  strokeWidth={1.4}
                  className="link-arrow size-4 text-muted-foreground"
                />
              </Link>
            );
          })}
        </div>
      </section>
      <section className="mt-16 border-t border-border pt-7" aria-labelledby="activity-heading">
        <div className="mb-5 flex items-center justify-between">
          <h2 id="activity-heading" className="text-base font-medium">
            Recent activity
          </h2>
          {isFeatureEnabled("analytics") && (
            <Link href="/analytics" className="text-xs text-muted-foreground hover:text-foreground">
              View all →
            </Link>
          )}
        </div>
        {activity.length ? (
          <div className="divide-y divide-border">
            {activity.slice(0, 4).map((event) => (
              <div key={event.id} className="flex flex-wrap items-center gap-3 py-4">
                <Clock3 strokeWidth={1.5} className="size-4 text-muted-foreground" />
                <span className="flex-1 text-sm">{event.label}</span>
                <Badge>{event.mode}</Badge>
                <span className="text-xs text-muted-foreground">{formatDate(event.createdAt)}</span>
                <span
                  className={
                    event.success ? "text-xs text-muted-foreground" : "text-xs text-destructive"
                  }
                >
                  {event.success ? "Completed" : "Failed"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-6 text-sm leading-7 text-muted-foreground">
            No runs yet. Activity appears here when you use a module.
            {mode === "demo" && " Demo runs are included."}
          </p>
        )}
      </section>
    </>
  );
}
