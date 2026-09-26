"use client";
import { useRef, useState } from "react";
import { BookOpen, FileText, Plus, Search, Trash2, Upload } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorNotice,
  Input,
  PageHeader,
  ResultText,
  Spinner,
  Textarea,
} from "@/components/ui";
import { useWorkspace } from "@/lib/workspace";
import { sampleDocument, type Citation } from "@/lib/knowledge";
import { useTask } from "@/hooks/use-task";

export function Knowledge() {
  const { documents, addDocument, removeDocument, ready, mode } = useWorkspace();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const task = useTask<{ output: string; citations: Citation[]; provider: string }>(
    "knowledge",
    "Knowledge query",
  );
  function add() {
    if (!title.trim() || !content.trim()) {
      setError("Add a title and document text.");
      return;
    }
    if (documents.length >= 20) {
      setError("The workspace holds up to 20 documents. Remove a source first.");
      return;
    }
    addDocument({ id: crypto.randomUUID(), title: title.trim(), content: content.trim() });
    setTitle("");
    setContent("");
    setError(null);
    task.clear();
  }
  async function upload(file?: File) {
    if (!file) return;
    setError(null);
    if (!/\.(txt|md)$/i.test(file.name)) {
      setError("Choose a .txt or .md file.");
      return;
    }
    if (file.size > 120000) {
      setError("Choose a text file under 120 KB and 30,000 characters.");
      return;
    }
    try {
      const text = await file.text();
      if (!text.trim() || text.length > 30000)
        throw new Error("Document must contain 1–30,000 characters.");
      setTitle(file.name.slice(0, 100));
      setContent(text);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to read file.");
    }
  }
  return (
    <>
      <PageHeader
        eyebrow="Core module / 03"
        title="Knowledge"
        description="Add a few sources, ask a question, and follow the answer back to the text."
        action={
          <Badge>
            <BookOpen className="size-3" />
            {documents.length} / 20 sources
          </Badge>
        }
      />
      <div className="grid items-start gap-12 xl:grid-cols-[.85fr_1.15fr]">
        <div className="space-y-5">
          <Card className="space-y-4 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium">Add a source</h2>
              <Button
                variant="ghost"
                size="sm"
                disabled={
                  !ready ||
                  task.busy ||
                  documents.some((doc) => doc.id === sampleDocument.id) ||
                  documents.length >= 20
                }
                onClick={() => {
                  addDocument(sampleDocument);
                  task.clear();
                }}
              >
                Load sample
              </Button>
            </div>
            <label className="block text-xs">
              Document title
              <Input
                value={title}
                maxLength={100}
                className="mt-2"
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. Product research notes"
              />
            </label>
            <label className="block text-xs">
              Source text
              <Textarea
                value={content}
                maxLength={30000}
                className="mt-2 min-h-40"
                onChange={(event) => setContent(event.target.value)}
                placeholder="Paste notes, documentation, or research…"
              />
            </label>
            <ErrorNotice message={error} />
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={add}
                disabled={!ready || task.busy || !title.trim() || !content.trim()}
              >
                <Plus className="size-4" />
                Add source
              </Button>
              <Button variant="secondary" onClick={() => fileInput.current?.click()}>
                <Upload className="size-4" />
                Import text
              </Button>
              <input
                ref={fileInput}
                type="file"
                accept=".txt,.md,text/plain,text/markdown"
                className="hidden"
                aria-label="Import a text or Markdown document"
                onChange={(event) => {
                  void upload(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </div>
            <p className="text-[11px] leading-5 text-muted-foreground">
              Text or Markdown · Up to 30,000 characters each · Stored in this browser
            </p>
          </Card>
          <Card>
            <div className="border-b border-border p-4 text-sm font-medium">Your sources</div>
            {documents.length ? (
              <div className="divide-y divide-border">
                {documents.map((document) => (
                  <div key={document.id} className="flex items-center gap-3 p-4">
                    <FileText className="size-4 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{document.title}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {document.content.length.toLocaleString()} characters
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={task.busy}
                      aria-label={`Remove ${document.title}`}
                      onClick={() => {
                        removeDocument(document.id);
                        task.clear();
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="p-5 text-xs leading-6 text-muted-foreground">
                No sources yet. Add your own text or load the sample guide to try it.
              </p>
            )}
          </Card>
        </div>
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-medium">Ask your knowledge</h2>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void task.run({ query, documents });
            }}
            className="space-y-3"
          >
            <label className="sr-only" htmlFor="knowledge-query">
              Question
            </label>
            <Input
              id="knowledge-query"
              placeholder="How does Demo Mode work?"
              value={query}
              maxLength={4000}
              onChange={(event) => setQuery(event.target.value)}
              disabled={task.busy}
            />
            <div className="flex gap-2">
              <Button disabled={!query.trim() || !documents.length || task.busy || !ready}>
                <Search className="size-4" />
                Find answer
              </Button>
              {task.busy && (
                <Button type="button" variant="secondary" onClick={task.cancel}>
                  Stop
                </Button>
              )}
            </div>
            <ErrorNotice message={task.error} />
          </form>
          <div className="mt-5 border-t border-border pt-5">
            {task.busy ? (
              <Spinner label="Finding matching passages…" />
            ) : task.result ? (
              <div className="space-y-5">
                <ResultText>{task.result.output}</ResultText>
                {task.result.citations.length > 0 && (
                  <div>
                    <h3 className="mb-3 text-xs font-medium text-muted-foreground">
                      SOURCE CITATIONS
                    </h3>
                    <div className="space-y-2">
                      {task.result.citations.map((citation, index) => (
                        <details
                          key={`${citation.documentId}-${citation.chunk}`}
                          className="border-b border-border py-4"
                        >
                          <summary className="cursor-pointer text-xs">
                            <span className="text-primary">[{index + 1}]</span> {citation.title} ·
                            Passage {citation.chunk + 1}
                          </summary>
                          <p className="mt-3 text-xs leading-6 text-muted-foreground">
                            {citation.text}
                          </p>
                        </details>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <EmptyState
                title="Answers from your sources"
                description="Retrieval uses keyword matches across overlapping text passages. Ask about something specific in your sources."
              />
            )}
          </div>
          <p className="mt-5 text-[11px] leading-5 text-muted-foreground">
            {mode === "demo"
              ? "Demo returns exact source excerpts. No model or embeddings are used."
              : "Live Mode sends retrieved excerpts and your question to Anthropic."}
          </p>
        </Card>
      </div>
    </>
  );
}
