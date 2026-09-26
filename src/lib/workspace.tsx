"use client";

import { createContext, useContext, useState, useSyncExternalStore, type ReactNode } from "react";
import { z } from "zod";

import type { Mode, ChatMessage, Document, Activity } from "./types";
export type { Mode, ChatMessage, Document, Activity } from "./types";
const documentSchema = z.object({
  id: z.string().max(100),
  title: z.string().min(1).max(100),
  content: z.string().min(1).max(30000),
});
const workspaceSchema = z.object({
  version: z.literal(1),
  mode: z.enum(["demo", "live"]),
  documents: z.array(documentSchema).max(20),
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(30000) }))
    .max(100),
  activity: z
    .array(
      z.object({
        id: z.string(),
        feature: z.string(),
        label: z.string(),
        mode: z.enum(["demo", "live"]),
        durationMs: z.number().nonnegative(),
        success: z.boolean(),
        createdAt: z.iso.datetime(),
      }),
    )
    .max(200),
});
type WorkspaceData = z.infer<typeof workspaceSchema>;
const initialData: WorkspaceData = {
  version: 1,
  mode: "demo",
  documents: [],
  messages: [],
  activity: [],
};
export const STORAGE_KEY = "launchpad.workspace.v1";

export function parseWorkspace(raw: string | null): WorkspaceData {
  if (!raw) return initialData;
  return workspaceSchema.parse(JSON.parse(raw));
}
type WorkspaceContextValue = WorkspaceData & {
  ready: boolean;
  storageError: string | null;
  setMode: (mode: Mode) => void;
  setMessages: (messages: ChatMessage[]) => void;
  addDocument: (document: Document) => void;
  removeDocument: (id: string) => void;
  track: (event: Omit<Activity, "id" | "createdAt">) => void;
  clearActivity: () => void;
  reset: () => void;
};
const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function createWorkspaceStore(storage?: Pick<Storage, "getItem" | "setItem">) {
  type Snapshot = WorkspaceData & { ready: boolean; storageError: string | null };
  const serverSnapshot: Snapshot = { ...initialData, ready: false, storageError: null };
  let snapshot = serverSnapshot;
  let preserveUnreadableData = false;
  const listeners = new Set<() => void>();
  const getStorage = () => storage ?? localStorage;
  function emit() {
    listeners.forEach((listener) => listener());
  }
  function update(data: WorkspaceData) {
    if (!snapshot.ready) return;
    const { version, mode, documents, messages, activity } = data;
    const persisted = { version, mode, documents, messages, activity };
    let storageError = snapshot.storageError;
    if (!preserveUnreadableData) {
      try {
        getStorage().setItem(STORAGE_KEY, JSON.stringify(persisted));
        storageError = null;
      } catch {
        storageError =
          "Browser storage is full or unavailable. Changes are kept only for this session. Export before closing.";
      }
    }
    snapshot = { ...data, ready: true, storageError };
    emit();
  }
  const actions: Omit<WorkspaceContextValue, keyof Snapshot> = {
    setMode: (mode) => update({ ...snapshot, mode }),
    setMessages: (messages) => update({ ...snapshot, messages: messages.slice(-100) }),
    addDocument: (document) =>
      update({
        ...snapshot,
        documents: [...snapshot.documents, documentSchema.parse(document)].slice(0, 20),
      }),
    removeDocument: (id) =>
      update({
        ...snapshot,
        documents: snapshot.documents.filter((document) => document.id !== id),
      }),
    track: (event) =>
      update({
        ...snapshot,
        activity: [
          { ...event, id: crypto.randomUUID(), createdAt: new Date().toISOString() },
          ...snapshot.activity,
        ].slice(0, 200),
      }),
    clearActivity: () => update({ ...snapshot, activity: [] }),
    reset: () => {
      preserveUnreadableData = false;
      update(initialData);
    },
  };
  return {
    actions,
    getSnapshot: () => snapshot,
    getServerSnapshot: () => serverSnapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      if (!snapshot.ready) {
        try {
          snapshot = {
            ...parseWorkspace(getStorage().getItem(STORAGE_KEY)),
            ready: true,
            storageError: null,
          };
        } catch {
          preserveUnreadableData = true;
          snapshot = {
            ...initialData,
            ready: true,
            storageError:
              "Saved workspace could not be read. Original storage is preserved until you reset. New work stays in this session; export before closing.",
          };
        }
        emit();
      }
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [store] = useState(() => createWorkspaceStore());
  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );
  return (
    <WorkspaceContext.Provider value={{ ...snapshot, ...store.actions }}>
      {children}
    </WorkspaceContext.Provider>
  );
}
export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error("WorkspaceProvider is required");
  return context;
}
