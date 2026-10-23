import fs from "node:fs";
export function checkMessage(text) {
  const lines = text.trimEnd().split("\n"),
    errors = [],
    warnings = [];
  if (!lines[0]?.trim())
    errors.push("A descriptive imperative subject is required.");
  if (lines[0]?.length > 50)
    warnings.push("Subject exceeds the 50-character target.");
  if (lines[0]?.endsWith("."))
    errors.push("Subject must not end with a period.");
  if (lines.length > 1 && lines[1] !== "")
    errors.push("Separate subject and body with one blank line.");
  lines.slice(2).forEach((line, i) => {
    if (line.length > 72 && !/^\S+$/.test(line))
      errors.push(
        `Body line ${i + 3} exceeds 72 characters; wrap ordinary prose.`,
      );
  });
  return { errors, warnings };
}
if (process.argv[1]?.endsWith("/commit-message.mjs")) {
  if (process.argv.length !== 3) {
    console.error("Usage: node scripts/commit-message.mjs MESSAGE_FILE");
    process.exit(2);
  }
  const result = checkMessage(fs.readFileSync(process.argv[2], "utf8"));
  result.warnings.forEach((x) => console.error("Warning: " + x));
  result.errors.forEach((x) => console.error("Error: " + x));
  process.exit(result.errors.length ? 1 : 0);
}
