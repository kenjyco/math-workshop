import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
const go = execFileSync(
  "go",
  [
    "list",
    "-deps",
    "-f",
    "{{if .Module}}{{.Module.Path}}|{{.Module.Version}}|{{.Module.Dir}}{{end}}",
    "./cmd/math-workshop",
  ],
  { encoding: "utf8" },
);
const modules = [
  ...new Set(
    go
      .trim()
      .split("\n")
      .filter(
        (line) => line.includes("|") && !line.startsWith("math-workshop|"),
      ),
  ),
];
modules.push(
  `svelte|${JSON.parse(fs.readFileSync("web/node_modules/svelte/package.json")).version}|${path.resolve("web/node_modules/svelte")}`,
);
const goRoot = execFileSync("go", ["env", "GOROOT"], { encoding: "utf8" }).trim();
const goVersion = execFileSync("go", ["env", "GOVERSION"], { encoding: "utf8" }).trim();
// Homebrew keeps LICENSE one directory above libexec; upstream archives keep it
// directly in GOROOT. Read the installed distribution, never invent a notice.
const goLicenseRoot = fs.existsSync(path.join(goRoot, "LICENSE"))
  ? goRoot : path.dirname(goRoot);
modules.push(`Go standard library|${goVersion}|${goLicenseRoot}`);
const vendor = path.join(goRoot, "src/vendor/golang.org/x");
if (fs.existsSync(vendor)) {
  for (const name of fs.readdirSync(vendor)) {
    const dir = path.join(vendor, name);
    if (fs.existsSync(path.join(dir, "LICENSE"))) modules.push(`Go bundled golang.org/x/${name}|${goVersion}|${dir}`);
  }
}
let output =
  "# Third-party runtime notices\n\nOriginal application code/content license selection is pending owner review.\nThese notices concern bundled dependencies, not a license grant for the project.\n\n";
for (const entry of modules) {
  const [name, version, dir] = entry.split("|");
  output += `## ${name} ${version}\n\n`;
  const licenses = fs
    .readdirSync(dir)
    .filter(
      (n) =>
        /^(LICENSE|COPYING|NOTICE|PATENTS)([._-].*)?$/i.test(n) &&
        fs.statSync(path.join(dir, n)).isFile(),
    );
  if (!licenses.length) throw new Error("No license text found for " + name);
  for (const file of licenses)
    output += `${file}\n\n${fs.readFileSync(path.join(dir, file), "utf8")}\n\n`;
}
const patents = path.join(goRoot, "PATENTS");
if (goLicenseRoot !== goRoot && fs.existsSync(patents)) output += `## Go additional patent notice\n\n${fs.readFileSync(patents, "utf8")}\n`;
fs.writeFileSync(".output/THIRD-PARTY-NOTICES.txt", output);
