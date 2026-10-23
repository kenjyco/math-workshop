# Development notes

## Tools and configuration

Locally verified working tools: Go 1.27.3, Node 24.22.0, npm 12.2.0, and optional
uv 0.8.13 / Python 3.13.7. The Go minimum stays 1.26.1. Use [go.mod](go.mod),
[go.sum](go.sum), [package.json](web/package.json), [npm lock](web/package-lock.json),
[Python project](tooling/pyproject.toml) and [uv lock](tooling/uv.lock) for exact
requirements and resolutions. Do not confuse a driver version with the SQLite
engine version. Review target-platform/toolchain support before distribution.

Frontend configuration lives in `web/` (Vite, Svelte, TypeScript, Playwright).
Current finite definitions are in `content/starter.json`; original revision-1
bodies remain in `content/legacy.json`. See [content](.context/content.md) for
supported bounds, lesson references and pinned rules. Go embeds the built
`web/dist` assets and content. The executable binds only numeric loopback;
`--help` describes `--data-dir`, `--port` and `--version`. Without a data override,
it uses the OS user config directory plus `MathWorkshopFoundation`. Learner data
belongs outside source and packages. An occupied fixed port fails; `--port 0`
asks the OS for a free port. Stop with Ctrl-C.

## Build and check

From the repository root:

```sh
sh scripts/build.sh
.output/math-workshop --data-dir /path/to/disposable-data --port 0
node scripts/check-docs.mjs
node scripts/check-source.mjs
node --test scripts/*.test.mjs
```

The build installs locked frontend dependencies with `npm ci`, checks
Svelte/TypeScript, runs frontend unit tests, builds assets, runs Go race tests and
vet, then creates `.output/math-workshop`. Direct Go compilation needs the frontend
assets first. Focused commands after building are `go test -race ./...`,
`go vet ./...`, `npm --prefix web run check` and `npm --prefix web test`.
The source-candidate check reads tracked and unignored files without staging them,
including in an unborn repository. It rejects generated records and nontext assets.

Install the test browser once with `cd web && npx playwright install chromium`.
Browser tests start and stop their own processes with temporary data. Optionally
set `WORKSHOP_PREVIOUS_BINARY` to a preceding executable to include the legacy
rendered resume/Next check; ordinary Go migration fixtures need no archived binary:

```sh
cd web
WORKSHOP_BINARY=/absolute/extracted-package/math-workshop \
WORKSHOP_TEST_OUTPUT=/absolute/test-output \
SCREENSHOT_DIR=/absolute/test-output/screenshots npm run test:browser
```

`WORKSHOP_BINARY` defaults to the local `.output` executable. Playwright reports
and attachments use `WORKSHOP_TEST_OUTPUT`; if omitted, they use a temporary
external directory. `SCREENSHOT_DIR` optionally retains representative screenshots.
Explicit output paths inside the checkout (including symlink aliases) are rejected.
Redirect command logs to an external path when retaining them. Installed dependencies,
ignored caches and ordinary `.output`/`web/dist` products may remain in the checkout.

The optional stdlib-only executable check uses only temporary synthetic data:

```sh
uv run --frozen --project tooling python tooling/smoke.py \
  --executable /absolute/extracted-package/math-workshop
```

The configured browser check builds a disposable clean export with independent 0–2/0–3
counting and factor totals 12, 16 and 7 through the normal embedded-content path:

```sh
node scripts/test-configured.mjs /absolute/external-configured-output
```

It runs the parameterized UI scenarios and removes its temporary source/executable.
The ordinary build still uses the shipped 0–5 and 24 defaults. A different
Playwright browser cache may be selected with `PLAYWRIGHT_BROWSERS_PATH`.

Add `--previous-executable /absolute/previous-package/math-workshop` for synthetic
schema/data compatibility. It creates its own prior-version database, never uses
existing learner data and preserves historical attempt/session meaning. See
[QA](.context/qa.md) for invariants and hands-on acceptance limits.

Follow the [prose and Go layout convention](.context/workflow.md#markdown-prose-and-go-layout).
Audit authored Go formatting with `gofmt -l cmd internal content web/assets.go`.

## Version and package

[VERSION](VERSION) is the canonical intended public target, currently 0.1.0.
Internal packages use 0.1.0-dev.1, 0.1.0-dev.2, and so on. An explicitly requested
release candidate may use 0.1.0-rc.1. Public release/tag authority is separate.
Goals, commit counts and internal iterations do not automatically bump the public
version; several goals can contribute to one release. Private tooling/frontend
metadata need not change with each internal suffix.

Choose an empty source destination and package output outside the checkout:

```sh
node scripts/source.mjs /absolute/empty/source-export
cd /absolute/empty/source-export
WORKSHOP_VERSION=0.1.0-dev.1 sh scripts/package.sh /absolute/package-output
```

Packaging requires an explicit bounded version matching the public target. The
package directory, archive, VERSION.txt and executable version agree. Unpackaged
builds default to the target plus `-development`; direct Go builds say `development`.
`WORKSHOP_VERSION` can select an explicit build identity. Existing package/version
outputs are never overwritten. Source export includes authored code, tests, locks
and durable guides; no external records are inputs. It writes a source manifest
and its digest in the export, and packages retain them with metadata and notices.
Checksums identify bytes; they do not assert byte-reproducible compilation or
invent an uncommitted Git SHA. No commits are needed to export or test a package.

From an extracted package, run `shasum -a 256 -c SHA256SUMS` before use. The generated
package README describes startup and recovery. For backup, stop every app using
the data directory and wait for exit before copying `workshop.sqlite`. Restore
into a different empty directory and confirm expected work before adopting it.
Do not call a copy of a live main database a coherent backup or lower an unsupported
schema version manually. Online backup and populated upgrade tooling remain future work.

## Origins and notices

Implementation references: [Svelte](https://svelte.dev/docs/svelte/overview),
[Vite](https://vite.dev/guide/) and
[modernc SQLite](https://pkg.go.dev/modernc.org/sqlite). All lesson examples and CSS
geometric marks are original to this project. System fonts are used by name, not
redistributed. No private classroom material, third-party educational worksheets,
downloaded images or external fonts were imported. `scripts/notices.mjs` collects full
license/notice texts for linked Go modules, Go's standard library and Svelte into the
package. Lockfiles retain development dependency provenance. The owner has not selected
a license for original code or content; bundled notices do not grant one.
