import fs from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";

function physical(value) {
  const absolute = path.resolve(value);
  if (fs.existsSync(absolute)) return fs.realpathSync(absolute);
  const parent = path.dirname(absolute);
  if (parent === absolute) throw new Error(`Cannot resolve path: ${value}`);
  return path.join(physical(parent), path.basename(absolute));
}
export function externalPath(
  value,
  root = path.resolve(import.meta.dirname, ".."),
) {
  if (!value || !value.trim())
    throw new Error("External output path must not be empty");
  const output = physical(value);
  const source = fs.realpathSync(root);
  if (output === source || output.startsWith(source + path.sep))
    throw new Error(
      `Retained output must be outside the source checkout: ${value}`,
    );
  return output;
}
export function testOutput() {
  return process.env.WORKSHOP_TEST_OUTPUT !== undefined
    ? externalPath(process.env.WORKSHOP_TEST_OUTPUT)
    : externalPath(
        fs.mkdtempSync(path.join(tmpdir(), "workshop-test-results-")),
      );
}
