"use client";
import { Button } from "@/components/ui";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main
      id="main-content"
      className="flex min-h-[70vh] flex-col items-center justify-center gap-5 p-8 text-center"
    >
      <h1 className="text-2xl font-semibold">Something interrupted this page.</h1>
      <p className="text-muted-foreground">
        Try loading it again. Your saved workspace stays in this browser.
      </p>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
