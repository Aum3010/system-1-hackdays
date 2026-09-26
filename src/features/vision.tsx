"use client";
import Image from "next/image";
import { useRef, useState } from "react";
import { ScanEye, Upload, X } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorNotice,
  PageHeader,
  ResultText,
  Spinner,
  Textarea,
} from "@/components/ui";
import { useTask } from "@/hooks/use-task";
import { useWorkspace } from "@/lib/workspace";
import type { ImageInput } from "@/lib/ai/types";

export function Vision() {
  const { mode, ready } = useWorkspace();
  const [image, setImage] = useState<(ImageInput & { name: string; url: string }) | null>(null);
  const [prompt, setPrompt] = useState(
    "Describe this image and highlight its most important details.",
  );
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const task = useTask<{ output: string; provider: string }>("vision", "Image analysis");
  function upload(file?: File) {
    if (!file) return;
    setError(null);
    task.clear();
    setImage(null);
    if (
      !["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type) ||
      file.size > 4 * 1024 * 1024
    ) {
      setError("Choose a PNG, JPEG, WebP, or GIF under 4 MB.");
      return;
    }
    setReading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result);
      setImage({
        mediaType: file.type as ImageInput["mediaType"],
        data: url.split(",")[1],
        name: file.name,
        url,
      });
      setReading(false);
    };
    reader.onerror = () => {
      setError("Unable to read this image.");
      setReading(false);
    };
    reader.readAsDataURL(file);
  }
  return (
    <>
      <PageHeader
        eyebrow="More modules / 01"
        title="Vision"
        description="Upload an image and explore the details, text, or ideas inside it."
        action={
          <Badge>
            {mode === "demo" ? "Illustrative demo analysis" : "Live image understanding"}
          </Badge>
        }
      />
      <div className="grid items-start gap-12 lg:grid-cols-2">
        <Card className="space-y-5 p-5">
          <input
            ref={input}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            aria-label="Upload image"
            onChange={(event) => {
              upload(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          {image ? (
            <div>
              <div className="relative flex h-64 items-center justify-center overflow-hidden rounded-lg border border-border bg-background">
                <Image
                  src={image.url}
                  alt={`Uploaded image: ${image.name}`}
                  fill
                  unoptimized
                  className="object-contain"
                />
              </div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="truncate text-xs text-muted-foreground">{image.name}</p>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={task.busy}
                  onClick={() => {
                    setImage(null);
                    task.clear();
                  }}
                >
                  <X className="size-3" />
                  Remove
                </Button>
              </div>
            </div>
          ) : (
            <button
              className="flex h-64 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-input bg-muted/25 transition-colors hover:bg-muted/50 disabled:opacity-50"
              onClick={() => input.current?.click()}
              disabled={reading}
            >
              <Upload className="mb-4 size-7 text-primary" />
              <span className="text-sm">{reading ? "Reading image…" : "Choose an image"}</span>
              <span className="mt-2 text-xs text-muted-foreground">
                PNG, JPEG, WebP, GIF · Up to 4 MB
              </span>
            </button>
          )}
          <label className="block text-xs font-medium">
            What would you like to know?
            <Textarea
              className="mt-2"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              maxLength={4000}
              disabled={task.busy}
            />
          </label>
          <ErrorNotice message={error || task.error} />
          <div className="flex gap-2">
            <Button
              disabled={!image || !prompt.trim() || task.busy || !ready}
              onClick={() =>
                void task.run({
                  prompt,
                  image: image && { data: image.data, mediaType: image.mediaType },
                })
              }
            >
              <ScanEye className="size-4" />
              Analyze image
            </Button>
            {task.busy && (
              <Button variant="secondary" onClick={task.cancel}>
                Stop
              </Button>
            )}
          </div>
          <p className="text-[11px] leading-5 text-muted-foreground">
            {mode === "demo"
              ? "Demo demonstrates the workflow using sample output; it does not interpret your image."
              : "Your image and question are sent to Anthropic. Images are not saved in your workspace."}
          </p>
        </Card>
        <Card className="p-6">
          {task.busy ? (
            <div className="flex min-h-64 items-center justify-center">
              <Spinner label="Analyzing image…" />
            </div>
          ) : task.result ? (
            <div>
              <Badge className="mb-4">
                {task.result.provider === "demo"
                  ? "Sample output · Not image-specific"
                  : "Anthropic analysis"}
              </Badge>
              <ResultText>{task.result.output}</ResultText>
            </div>
          ) : (
            <EmptyState
              title="Image analysis"
              description="Ask for a description, extract visible text, or explore how a design could work."
            />
          )}
        </Card>
      </div>
    </>
  );
}
