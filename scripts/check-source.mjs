import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { sourceFiles } from "./source-files.mjs";

// Inline SVG/DOM/CSS is authored code; standalone images and generated records are not.
const forbiddenType =
  /\.(png|jpe?g|gif|webp|avif|svg|ico|bmp|tiff?|heic|pdf|woff2?|ttf|otf|eot|zip|tar|gz|tgz|bz2|xz|7z|dmg|exe|dll|so|dylib|a|o|wasm|class|pyc|mp[34]|mov|wav|ogg|sqlite.*|db(?:-.*)?|log|trace|sha256)$/i;
const forbiddenName =
  /^(SOURCE-(?:MANIFEST.*|DIGEST)|SHA256SUMS|VERSION\.txt|THIRD-PARTY-NOTICES\.txt|.*(?:build|browser|test|qa|smoke)[-_](?:report|results?)(?:\..*)?)$/i;
const forbiddenDirectory =
  /(^|\/)(docs|development|releases|local-data|evidence|screenshots|test-results|playwright-report|blob-report|coverage|dist|node_modules|\.output|\.cache|\.venv|__pycache__)(\/|$)/;
export function checkSourceFile(root, relative) {
  if (
    forbiddenType.test(relative) ||
    forbiddenName.test(path.basename(relative)) ||
    forbiddenDirectory.test(relative) ||
    relative === "STATUS.md"
  )
    throw new Error(`Forbidden source artifact: ${relative}`);
  const full = path.join(root, relative);
  const info = fs.lstatSync(full);
  if (!info.isFile())
    throw new Error(`Source must be a regular file: ${relative}`);
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(
      fs.readFileSync(full),
    );
  } catch {
    throw new Error(`Non-UTF-8 source: ${relative}`);
  }
  if (/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(text))
    throw new Error(`Binary/control bytes in source: ${relative}`);
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const root = path.resolve(import.meta.dirname, "..");
  const exported = sourceFiles(root);
  const candidates = fs.existsSync(path.join(root, ".git"))
    ? execFileSync(
        "git",
        ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
        {
          cwd: root,
          encoding: "utf8",
          env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
        },
      )
        .split("\0")
        .filter(Boolean)
    : exported;
  const failures = [];
  let count = 0;
  for (const name of new Set(candidates)) {
    // Deleted tracked files are not part of the prospective working-tree source.
    if (
      !fs.existsSync(path.join(root, name)) &&
      !fs.lstatSync(path.join(root, name), { throwIfNoEntry: false })
    )
      continue;
    try {
      checkSourceFile(root, name);
      if (!exported.includes(name))
        throw new Error(`Source is missing from export allowlist: ${name}`);
      count++;
    } catch (error) {
      failures.push(error.message);
    }
  }
  if (failures.length) {
    console.error(failures.join("\n"));
    process.exit(1);
  }
  console.log(
    `PASS: ${count} source candidates are text, contain no forbidden artifacts and belong to the export.`,
  );
}
