import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { selectVersion } from "./version.mjs";
import { checkSourceFile } from "./check-source.mjs";
import { externalPath } from "./external-output.mjs";

test("versions distinguish development defaults and explicit bounded package identities", () => {
  assert.equal(selectVersion("0.1.0"), "0.1.0-development");
  for (const value of ["0.1.0", "0.1.0-dev.1", "0.1.0-dev.10", "0.1.0-rc.1"])
    assert.equal(selectVersion("0.1.0", value, true), value);
  for (const value of [
    undefined,
    "",
    "0.1.1-dev.1",
    "0.1.0-dev.0",
    "0.1.0-dev.01",
    "0.1.0-dev.1000000",
    "0.1.0-preview",
    "0.1.0\n",
    "0.1.0-dev.1\n",
    "../0.1.0",
    "0.1.0;touch x",
    "0.1.0\n-X x",
  ])
    assert.throws(() => selectVersion("0.1.0", value, true));
  assert.throws(() => selectVersion("00.1.0"));
});

test("source candidates reject artifact types and renamed binary/font contents", () => {
  const root = fs.mkdtempSync(path.join(tmpdir(), "workshop-source-check-"));
  try {
    for (const name of [
      "screenshot.png",
      "diagram.svg",
      "font.woff2",
      "build.log",
      "SOURCE-MANIFEST.sha256",
      "browser-results.json",
    ]) {
      fs.writeFileSync(path.join(root, name), "even valid text is an artifact");
      assert.throws(() => checkSourceFile(root, name), /Forbidden/);
    }
    for (const bytes of [
      Buffer.from([0xcf, 0xfa, 0xed, 0xfe]),
      Buffer.from("wOF2\0font"),
      Buffer.from("header\x01binary"),
    ]) {
      fs.writeFileSync(path.join(root, "renamed.txt"), bytes);
      assert.throws(
        () => checkSourceFile(root, "renamed.txt"),
        /Non-UTF-8|Binary/,
      );
    }
    fs.writeFileSync(
      path.join(root, "source.ts"),
      "const svg = `<svg>π × 4</svg>`;\n",
    );
    checkSourceFile(root, "source.ts");
    fs.symlinkSync("source.ts", path.join(root, "link.ts"));
    assert.throws(() => checkSourceFile(root, "link.ts"), /regular file/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("retained output rejects checkout paths and physical symlink aliases", () => {
  const temp = fs.mkdtempSync(path.join(tmpdir(), "workshop-output-check-"));
  try {
    const root = path.join(temp, "source");
    fs.mkdirSync(root);
    const alias = path.join(temp, "alias");
    fs.symlinkSync(root, alias);
    for (const value of [
      "",
      root,
      path.join(root, "new/results"),
      path.join(alias, "new/results"),
    ])
      assert.throws(() => externalPath(value, root));
    const outside = path.join(temp, "records with spaces", "results");
    assert.equal(
      externalPath(outside, root),
      path.join(fs.realpathSync(temp), "records with spaces", "results"),
    );
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
