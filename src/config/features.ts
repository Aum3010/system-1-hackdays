export const features = [
  {
    id: "chat",
    name: "AI Chat",
    description: "Streaming conversations with history and export.",
    href: "/chat",
    icon: "MessageSquare",
    category: "Create",
  },
  {
    id: "agents",
    name: "Agents",
    description: "Run tools in sequence and inspect their results.",
    href: "/agents",
    icon: "Bot",
    category: "Create",
  },
  {
    id: "knowledge",
    name: "Knowledge",
    description: "Search your sources and answer with citations.",
    href: "/knowledge",
    icon: "BookOpen",
    category: "Create",
  },
  {
    id: "vision",
    name: "Vision",
    description: "Upload an image and ask about its contents.",
    href: "/vision",
    icon: "ScanEye",
    category: "Explore",
  },
  {
    id: "voice",
    name: "Voice",
    description: "Speak, edit a transcript, and listen to a response.",
    href: "/voice",
    icon: "AudioLines",
    category: "Explore",
  },
  {
    id: "workflows",
    name: "Workflows",
    description: "Connect prompts into repeatable sequences.",
    href: "/workflows",
    icon: "Workflow",
    category: "Explore",
  },
  {
    id: "analytics",
    name: "Analytics",
    description: "Review runs, durations, and completion rates.",
    href: "/analytics",
    icon: "ChartNoAxesCombined",
    category: "Workspace",
  },
] as const;
export type FeatureId = (typeof features)[number]["id"];
export function isFeatureEnabled(id: FeatureId) {
  return !(process.env.NEXT_PUBLIC_DISABLED_FEATURES ?? "")
    .split(",")
    .map((item) => item.trim())
    .includes(id);
}
export const enabledFeatures = features.filter((feature) => isFeatureEnabled(feature.id));
