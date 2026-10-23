import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { sourceFiles } from "./source-files.mjs";
import { checkSourceFile } from "./check-source.mjs";
import { externalPath } from "./external-output.mjs";
const root = path.resolve(import.meta.dirname, "..");
const sorted = sourceFiles(root);
for (const file of sorted) checkSourceFile(root, file);
const manifest = sorted
  .map((file) => {
    const data = fs.readFileSync(path.join(root, file));
    return `${createHash("sha256").update(data).digest("hex")}  ${file}\n`;
  })
  .join("");
const digest = createHash("sha256").update(manifest).digest("hex");
const destination = process.argv[2];
if (destination) {
  const out = externalPath(destination, root);
  if (fs.existsSync(out) && fs.readdirSync(out).length)
    throw new Error("Export destination must be empty");
  fs.mkdirSync(out, { recursive: true });
  for (const file of sorted) {
    const target = path.join(out, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(root, file), target);
    fs.chmodSync(target, fs.statSync(path.join(root, file)).mode & 0o777);
  }
  fs.writeFileSync(path.join(out, "SOURCE-MANIFEST.sha256"), manifest);
  fs.writeFileSync(path.join(out, "SOURCE-DIGEST"), digest + "\n");
}
console.log(digest);
