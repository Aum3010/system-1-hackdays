import { AppShell } from "@/components/app-shell";
import { WorkspaceProvider } from "@/lib/workspace";
export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceProvider>
      <AppShell>{children}</AppShell>
    </WorkspaceProvider>
  );
}
