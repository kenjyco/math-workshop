import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const number = "(?:0|[1-9][0-9]{0,5})";
const core = new RegExp(`^${number}\\.${number}\\.${number}$`);
const version = new RegExp(
  `^(${number}\\.${number}\\.${number})(?:-(dev|rc)\\.([1-9][0-9]{0,5}))?$`,
);
export function selectVersion(target, requested, packaged = false) {
  if (!core.test(target) || target.trim() !== target)
    throw new Error("VERSION must contain a bounded X.Y.Z public target");
  if (requested === undefined && !packaged) return target + "-development";
  const match = typeof requested === "string" && requested.match(version);
  if (!match || match[0] !== requested || match[1] !== target)
    throw new Error(
      `WORKSHOP_VERSION must be ${target}, ${target}-dev.N or ${target}-rc.N (N: 1..999999)`,
    );
  return requested;
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const target = fs
    .readFileSync(new URL("../VERSION", import.meta.url), "utf8")
    .trim();
  console.log(
    selectVersion(
      target,
      process.env.WORKSHOP_VERSION,
      process.argv[2] === "--package",
    ),
  );
}
