import { notFound } from "next/navigation";
import { features, isFeatureEnabled } from "@/config/features";
import { Chat } from "@/features/chat";
import { Agents } from "@/features/agents";
import { Knowledge } from "@/features/knowledge";
import { Vision } from "@/features/vision";
import { Voice } from "@/features/voice";
import { Workflows } from "@/features/workflows";
import { Analytics } from "@/features/analytics";

const views = {
  chat: Chat,
  agents: Agents,
  knowledge: Knowledge,
  vision: Vision,
  voice: Voice,
  workflows: Workflows,
  analytics: Analytics,
};
export function generateStaticParams() {
  return features.map((feature) => ({ module: feature.id }));
}
export async function generateMetadata({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params;
  return { title: features.find((feature) => feature.id === module)?.name ?? "Module" };
}
export default async function Page({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params;
  const feature = features.find((item) => item.id === module);
  if (!feature || !isFeatureEnabled(feature.id)) notFound();
  const View = views[feature.id];
  return <View />;
}
