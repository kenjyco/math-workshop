import fs from "node:fs";
import path from "node:path";

export function sourceFiles(root) {
  const trees = [
    "cmd",
    "internal",
    "web/src",
    "web/tests",
    "content",
    "scripts",
    "tooling",
    "goals",
    ".context",
  ];
  const files = [
    ".gitignore",
    "AGENTS.md",
    "NORTH_STAR.md",
    "README.md",
    "DESIGN.md",
    "go.mod",
    "go.sum",
    "web/.prettierrc.json",
    "web/package.json",
    "web/package-lock.json",
    "web/tsconfig.json",
    "web/vite.config.ts",
    "web/playwright.config.ts",
    "web/svelte.config.js",
    "web/index.html",
    "web/assets.go",
    "DEV-NOTES.md",
    "VERSION",
  ];
  const ignored = new Set([
    ".venv",
    "__pycache__",
    "node_modules",
    ".DS_Store",
    ".cache",
    "test-results",
    "playwright-report",
    "coverage",
  ]);
  function walk(relative) {
    for (const item of fs.readdirSync(path.join(root, relative), {
      withFileTypes: true,
    })) {
      if (ignored.has(item.name)) continue;
      const name = relative + "/" + item.name;
      if (item.isSymbolicLink())
        throw new Error("Source symlink not allowed: " + name);
      if (item.isDirectory()) walk(name);
      else if (item.isFile()) files.push(name);
    }
  }
  for (const tree of trees) walk(tree);
  return [...new Set(files)].sort();
}
