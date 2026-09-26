import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Launchpad — Hackathon starter", template: "%s · Launchpad" },
  description:
    "Your AI hackathon workspace. Chat, agents, knowledge, vision, voice, and workflows — ready to make your own.",
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <a
          href="#main-content"
          className="sr-only z-50 rounded bg-primary p-3 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
