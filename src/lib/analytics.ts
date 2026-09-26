import type { Activity } from "./types";
export function summarizeActivity(activity: Activity[]) {
  const success = activity.filter((event) => event.success).length;
  return {
    total: activity.length,
    successRate: activity.length ? Math.round((success / activity.length) * 100) : 0,
    averageMs: activity.length
      ? Math.round(activity.reduce((sum, event) => sum + event.durationMs, 0) / activity.length)
      : 0,
    demoRuns: activity.filter((event) => event.mode === "demo").length,
  };
}
export function dailyActivity(activity: Activity[], now = new Date()) {
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(now);
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - 6 + index);
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    return {
      label: new Intl.DateTimeFormat("en", { weekday: "short" }).format(day),
      count: activity.filter(
        (event) => new Date(event.createdAt) >= day && new Date(event.createdAt) < next,
      ).length,
    };
  });
}
