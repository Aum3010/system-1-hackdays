import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const required = [
  "package.json",
  "pnpm-lock.yaml",
  ".env.example",
  "README.md",
  "CLAUDE.md",
  "PROJECT_STATUS.md",
  "RESUME.md",
  "HACKATHON_GUIDE.md",
  "docs/MODULES.md",
  "docs/CLAUDE_WORKFLOWS.md",
  ".claude/skills",
  ".claude/agents",
  "src/config/features.ts",
  "src/app/layout.tsx",
];
const errors = required
  .filter((file) => !existsSync(join(root, file)))
  .map((file) => `Missing: ${file}`);
const ignored = new Set(["node_modules", ".next", ".git", ".tools", "coverage", ".pnpm-store"]);
let count = 0;
function inspect(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const path = join(directory, entry.name);
    const rel = relative(root, path);
    if (entry.isDirectory()) {
      inspect(path);
      continue;
    }
    count++;
    if (entry.name === "package.json" && directory !== root)
      errors.push(`Unexpected nested package: ${rel}`);
    if (/^\.env/.test(entry.name) && entry.name !== ".env.example") {
      console.log(`Local environment file present (must remain untracked): ${rel}`);
      continue;
    }
    if (/\.(ts|tsx|js|mjs|json|md|yaml|yml)$/.test(entry.name) || entry.name === ".env.example") {
      const content = readFileSync(path, "utf8");
      if (
        /sk-ant-[A-Za-z0-9_-]{24,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(content)
      )
        errors.push(`Possible secret material: ${rel}`);
    }
  }
}
inspect(root);
if (errors.length) {
  errors.forEach((error) => console.error(error));
  process.exitCode = 1;
} else
  console.log(
    `PASS: ${required.length} required paths; ${count} source/config/doc files; no nested package or detected secret material.`,
  );
