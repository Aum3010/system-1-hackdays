import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui";
import { enabledFeatures } from "@/config/features";
import { featureIcons } from "@/components/icons";

export default function LandingPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 sm:px-12">
      <header className="flex h-24 items-center justify-between gap-5">
        <Link href="/" aria-label="Launchpad home">
          <Brand />
        </Link>
        <nav className="flex items-center gap-7 text-xs">
          <a
            href="#modules"
            className="hidden text-muted-foreground hover:text-foreground sm:block"
          >
            Modules
          </a>
          <Link href="/dashboard" className="inline-flex items-center gap-2">
            Open workspace <ArrowUpRight className="size-3.5" />
          </Link>
        </nav>
      </header>
      <main id="main-content">
        <section className="page-enter pb-20 pt-16 sm:pb-28 sm:pt-24">
          <p className="mb-7 text-[11px] uppercase tracking-[.18em] text-muted-foreground">
            A reusable hackathon starter
          </p>
          <h1 className="max-w-3xl text-[2.8rem] font-normal leading-[1.1] tracking-[-.055em] sm:text-7xl">
            A starting point.
            <br />
            <span className="font-serif italic text-muted-foreground">The rest is yours.</span>
          </h1>
          <div className="mt-8 flex flex-col justify-between gap-9 sm:mt-10 lg:flex-row lg:items-end">
            <p className="max-w-md text-base leading-8 text-muted-foreground">
              Chat, tools, retrieval, and workflows. Working modules you can explore here and adapt
              for your next project.
            </p>
            <div>
              <Button asChild size="lg">
                <Link href="/dashboard">
                  Explore the workspace <ArrowRight className="size-4" />
                </Link>
              </Button>
              <p className="mt-4 text-xs text-muted-foreground">
                Demo Mode included. No API key required.
              </p>
            </div>
          </div>
        </section>
        <section id="modules" className="border-t border-border pb-20 pt-8">
          <div className="mb-10 flex flex-wrap items-baseline justify-between gap-4">
            <h2 className="text-lg font-medium">Choose what you need.</h2>
            <span className="text-xs text-muted-foreground">
              {enabledFeatures.length} modules / one shared foundation
            </span>
          </div>
          <div className="stagger-in grid gap-x-16 sm:grid-cols-2">
            {enabledFeatures.map((feature, index) => {
              const Icon = featureIcons[feature.icon];
              return (
                <Link
                  href={feature.href}
                  key={feature.id}
                  className="module-link group flex items-start gap-5 border-t border-border py-8 sm:hover:px-2"
                >
                  <Icon strokeWidth={1.4} className="mt-1 size-5 shrink-0 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="mb-2 flex items-baseline gap-3">
                      <h3 className="text-base font-medium">{feature.name}</h3>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        0{index + 1}
                      </span>
                    </div>
                    <p className="max-w-xs text-sm leading-7 text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                  <ArrowUpRight className="link-arrow mt-1 size-4 shrink-0 text-muted-foreground" />
                </Link>
              );
            })}
          </div>
        </section>
        <section className="grid gap-8 border-t border-border py-12 sm:grid-cols-[1fr_2fr]">
          <h2 className="text-lg font-medium">Built to be adapted.</h2>
          <div className="grid gap-8 sm:grid-cols-2">
            <div>
              <h3 className="mb-3 text-sm font-medium">Start with the demo</h3>
              <p className="text-sm leading-7 text-muted-foreground">
                Try each module with sample responses and real local tools. Connect a live provider
                when you need it.
              </p>
            </div>
            <div>
              <h3 className="mb-3 text-sm font-medium">Keep the parts that fit</h3>
              <p className="text-sm leading-7 text-muted-foreground">
                Use the whole starter or reuse the underlying logic. Module boundaries and
                integration recipes are documented in the repository.
              </p>
            </div>
          </div>
        </section>
      </main>
      <footer className="flex flex-wrap justify-between gap-4 border-t border-border py-8 text-xs text-muted-foreground">
        <span>Launchpad / Hackathon starter</span>
        <span>Next.js · TypeScript · Yours to adapt</span>
      </footer>
    </div>
  );
}
