import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, dirname, extname, join, relative, resolve } from "node:path";

const root = process.cwd();
const skip = new Set(["node_modules", ".next", ".git", ".tools", "coverage", ".pnpm-store"]);
const markdown = [];
const errors = [];
function walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (skip.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (extname(path).toLowerCase() === ".md") markdown.push(path);
  }
}
walk(root);
const skillNames = new Set();
const agentNames = new Set();
const allowedTools = new Set(["Read", "Glob", "Grep", "Edit", "Write", "Bash", "PowerShell"]);
for (const path of markdown) {
  const name = relative(root, path).replaceAll("\\", "/");
  const source = readFileSync(path, "utf8");
  const withoutCode = source.replace(/```[\s\S]*?```/g, "");
  for (const match of withoutCode.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const target = match[1].trim().replace(/^<|>$/g, "");
    if (/^(?:https?:|mailto:|#)/.test(target)) continue;
    const file = decodeURIComponent(target.split("#")[0]);
    if (file && !existsSync(resolve(dirname(path), file)))
      errors.push(`${name}: broken link ${target}`);
  }
  if (/\[TODO:|\bINSERT_DESCRIPTION_HERE\b/.test(withoutCode))
    errors.push(`${name}: unfinished scaffold marker`);
  const isSkill = name.startsWith(".claude/skills/") && basename(path) === "SKILL.md";
  const isAgent = name.startsWith(".claude/agents/");
  if (!isSkill && !isAgent) continue;
  const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!frontmatter) {
    errors.push(`${name}: missing frontmatter`);
    continue;
  }
  const values = {};
  for (const line of frontmatter[1].split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const field = line.match(/^([a-z-]+):\s*(.+)$/);
    if (!field) {
      errors.push(
        `${name}: unsupported non-scalar frontmatter; validate YAML before extending checker`,
      );
      continue;
    }
    if (field[1] in values) errors.push(`${name}: duplicate ${field[1]}`);
    values[field[1]] = field[2];
  }
  const expected = isSkill ? basename(dirname(path)) : basename(path, ".md");
  if (values.name !== expected || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(values.name ?? ""))
    errors.push(`${name}: invalid or mismatched name`);
  if (!values.description?.trim()) errors.push(`${name}: missing description`);
  if (!source.slice(frontmatter[0].length).trim()) errors.push(`${name}: missing instructions`);
  const names = isSkill ? skillNames : agentNames;
  if (names.has(values.name)) errors.push(`${name}: duplicate name`);
  names.add(values.name);
  if (isAgent) {
    if (!values.tools) errors.push(`${name}: missing tool allowlist`);
    for (const tool of (values.tools ?? "").split(",").map((item) => item.trim())) {
      if (!allowedTools.has(tool)) errors.push(`${name}: unexpected tool ${tool}`);
    }
  }
}
if (!skillNames.size || !agentNames.size) errors.push("Missing project skills or agents");
if (errors.length) {
  errors.forEach((error) => console.error(error));
  process.exitCode = 1;
} else
  console.log(
    `PASS: ${markdown.length} project Markdown files; local links; ${skillNames.size} skills and ${agentNames.size} agents structurally valid. Semantic review and full YAML validation are separate.`,
  );
