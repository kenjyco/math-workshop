import fs from "node:fs";
import path from "node:path";
const root = path.resolve(import.meta.dirname, "..");
const ignored = new Set([
  ".git",
  ".output",
  "node_modules",
  "dist",
  ".venv",
  "test-results",
  "playwright-report",
  "__pycache__",
]);
const documents = [];
function walk(dir) {
  for (const file of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignored.has(file.name)) continue;
    const full = path.join(dir, file.name);
    if (file.isDirectory()) walk(full);
    else if (file.name.endsWith(".md")) documents.push(full);
  }
}
walk(root);
const failures = [];
for (const file of documents) {
  const text = fs.readFileSync(file, "utf8");
  for (const match of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const [link, anchor] = match[1].split("#");
    if (/^[a-z]+:/i.test(link)) continue;
    const target = link ? path.resolve(path.dirname(file), link) : file;
    if (target !== root && !target.startsWith(root + path.sep)) {
      failures.push(
        path.relative(root, file) + ": link leaves checkout: " + link,
      );
      continue;
    }
    if (!fs.existsSync(target)) {
      failures.push(path.relative(root, file) + ": missing " + link);
    } else if (anchor && target.endsWith(".md")) {
      const seen = new Map();
      const headings = [
        ...fs.readFileSync(target, "utf8").matchAll(/^#{1,6} +(.+)$/gm),
      ].map((m) => {
        const slug = m[1]
          .toLowerCase()
          .replace(/[^\p{L}\p{N}_ -]/gu, "")
          .replace(/ /g, "-");
        const count = seen.get(slug) || 0;
        seen.set(slug, count + 1);
        return count ? `${slug}-${count}` : slug;
      });
      if (!headings.includes(decodeURIComponent(anchor)))
        failures.push(
          path.relative(root, file) + ": missing heading " + match[1],
        );
    }
  }
  if (/\/Users\/|(?:sk-[A-Za-z0-9]{20,})/.test(text))
    failures.push(
      path.relative(root, file) + ": private path or credential-shaped text",
    );
}
for (let i = 1; i <= 7; i++) {
  const prefix = String(i).padStart(3, "0") + "-";
  if (
    fs
      .readdirSync(path.join(root, "goals"))
      .filter((f) => f.startsWith(prefix) && f.endsWith(".md")).length !== 1
  )
    failures.push("Expected one goal " + prefix);
}
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(
  `PASS: ${documents.length} Markdown files; local links/headings and stable goal filenames resolve.`,
);
