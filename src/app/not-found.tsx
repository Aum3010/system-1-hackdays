import Link from "next/link";
import { Button } from "@/components/ui";
export default function NotFound() {
  return (
    <main
      id="main-content"
      className="flex min-h-screen flex-col items-center justify-center gap-5 p-8 text-center"
    >
      <p className="font-mono text-primary">404 / OFF THE MAP</p>
      <h1 className="text-3xl font-semibold">This page isn’t in your workspace.</h1>
      <p className="text-muted-foreground">It may have moved, or the module may be disabled.</p>
      <Button asChild>
        <Link href="/dashboard">Back to dashboard</Link>
      </Button>
    </main>
  );
}
