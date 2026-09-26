"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, ChevronRight, LayoutDashboard, Menu, Settings2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { enabledFeatures } from "@/config/features";
import { featureIcons } from "@/components/icons";
import { Brand } from "@/components/brand";
import { Badge, Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/lib/workspace";

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const { mode, storageError } = useWorkspace();
  const nav = useRef<HTMLElement>(null);
  const menu = useRef<HTMLButtonElement>(null);
  const title =
    enabledFeatures.find((feature) => feature.href === path)?.name ??
    (path === "/settings" ? "Settings" : "Overview");
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => {
      if (desktop.matches) setOpen(false);
    };
    desktop.addEventListener("change", closeOnDesktop);
    nav.current?.querySelector<HTMLElement>("a, button")?.focus();
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        menu.current?.focus();
      }
      if (event.key !== "Tab" || !nav.current) return;
      const controls = [...nav.current.querySelectorAll<HTMLElement>("a, button")].filter(
        (element) => element.getClientRects().length,
      );
      const first = controls[0];
      const last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", handleKey);
      desktop.removeEventListener("change", closeOnDesktop);
    };
  }, [open]);
  const navClass = (href: string) =>
    cn(
      "flex items-center gap-3 rounded-md px-3 py-2.5 text-[13px] transition-colors",
      path === href
        ? "bg-muted text-foreground font-medium"
        : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
    );
  return (
    <div className="min-h-screen">
      {open && (
        <button
          tabIndex={-1}
          aria-label="Close navigation overlay"
          className="fixed inset-0 z-30 bg-foreground/15 backdrop-blur-[2px] lg:hidden"
          onClick={() => {
            setOpen(false);
            menu.current?.focus();
          }}
        />
      )}
      <aside
        ref={nav}
        id="workspace-navigation"
        data-open={open}
        aria-label="Workspace navigation"
        className={cn(
          "workspace-nav fixed inset-y-0 left-0 z-40 flex w-56 flex-col overflow-y-auto bg-[#f3f2ee] px-5 py-8 transition-transform duration-250 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-2">
          <Link href="/" aria-label="Launchpad home">
            <Brand />
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Close navigation"
            onClick={() => {
              setOpen(false);
              menu.current?.focus();
            }}
          >
            <X className="size-4" />
          </Button>
        </div>
        <p className="mb-9 mt-3 px-2 text-[11px] text-muted-foreground">Your hackathon toolkit</p>
        <nav className="space-y-1" onClick={() => setOpen(false)}>
          <Link
            href="/dashboard"
            aria-current={path === "/dashboard" ? "page" : undefined}
            className={navClass("/dashboard")}
          >
            <LayoutDashboard strokeWidth={1.5} className="size-4" />
            Overview
          </Link>
          {["Create", "Explore", "Workspace"].map((category) => (
            <div key={category}>
              <p className="mb-2 mt-7 px-3 text-[10px] uppercase tracking-[.12em] text-muted-foreground">
                {category === "Create"
                  ? "Core modules"
                  : category === "Explore"
                    ? "More modules"
                    : category}
              </p>
              {enabledFeatures
                .filter((feature) => feature.category === category)
                .map((feature) => {
                  const Icon = featureIcons[feature.icon];
                  return (
                    <Link
                      key={feature.id}
                      href={feature.href}
                      aria-current={path === feature.href ? "page" : undefined}
                      className={navClass(feature.href)}
                    >
                      <Icon strokeWidth={1.5} className="size-4" />
                      {feature.name}
                    </Link>
                  );
                })}
            </div>
          ))}
          <Link
            href="/settings"
            aria-current={path === "/settings" ? "page" : undefined}
            className={navClass("/settings")}
          >
            <Settings2 strokeWidth={1.5} className="size-4" />
            Settings
          </Link>
        </nav>
        <div className="mt-auto px-3 pt-12">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
          >
            About this starter <ArrowUpRight className="size-3" />
          </Link>
          <p className="mt-4 font-mono text-[10px] text-muted-foreground">Local workspace / v1.0</p>
        </div>
      </aside>
      <div className="lg:pl-56">
        <header className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-3 px-5 sm:px-10 lg:px-14">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              ref={menu}
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label="Open navigation"
              aria-controls="workspace-navigation"
              aria-expanded={open}
              onClick={() => setOpen(true)}
            >
              <Menu className="size-5" />
            </Button>
            <span className="hidden text-xs text-muted-foreground sm:inline">Workspace</span>
            <ChevronRight className="hidden size-3 text-muted-foreground sm:block" />
            <span className="text-xs">{title}</span>
          </div>
          <Badge className="shrink-0 bg-transparent">
            <span
              className={cn(
                "size-1.5 rounded-full",
                mode === "demo" ? "bg-muted-foreground" : "bg-[#786c49]",
              )}
            />
            {mode === "demo" ? "Demo Mode" : "Live Mode"}
          </Badge>
        </header>
        <main
          id="main-content"
          className="mx-auto min-h-[calc(100vh-10rem)] max-w-6xl px-5 pb-16 pt-8 sm:px-10 sm:pt-12 lg:px-14"
        >
          {storageError && (
            <p
              role="alert"
              className="mb-8 border-l-2 border-[#8c7750] bg-[#f3eee4] p-4 text-xs leading-6 text-[#725d36]"
            >
              {storageError}
            </p>
          )}
          <div key={path} className="page-enter">
            {children}
          </div>
        </main>
        <footer className="mx-auto flex max-w-6xl flex-wrap justify-between gap-3 px-5 py-7 text-[11px] text-muted-foreground sm:px-10 lg:px-14">
          <span>Launchpad / Hackathon starter</span>
          <span>
            {mode === "demo"
              ? "Demo responses · No API key required"
              : "Live requests · Provider usage may incur costs"}
          </span>
        </footer>
      </div>
    </div>
  );
}
