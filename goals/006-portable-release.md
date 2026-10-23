# 006 — Portable family release and real-device use

## Outcome and definition of done

The family can install and update the app on the actual destination laptop,
recover real populated data from a tested backup, and understand supported device
access. Done means destination packaging/run/restart, database-aware backup/restore,
populated upgrade checks, notices and recovery instructions are verified with the
owner's target information. Optional iPad access is a separately authorized,
explicitly secured LAN/server part; local-only remains a useful release mode.

## Starting state and prerequisites

The foundation already delivers an embedded Go host preview, explicit data path,
loopback-only server, source/package checksums and full runtime notices. Clean
export/build, executable restart and stopped-app backup/restore have test entry points.
Schema-1-to-2 compatibility already has source-generated fixtures and an optional
preceding-executable smoke path; actual populated family upgrade recovery remains part
of this goal. It does **not** implement online backup, populated upgrade UI/tooling, LAN
pairing, account auth, actual iPad validation or cross-device synchronization. Do not
relabel desktop emulation or a cross-build as destination acceptance.

First reconcile all intervening accepted goals/schema versions and current package
scripts. Obtain destination OS/CPU/browser, installation constraints and actual
owner/device access. LAN/iPad implementation additionally requires network/device
and security preferences. Read [development and package notes](../DEV-NOTES.md),
[architecture](../.context/architecture.md), [QA](../.context/qa.md),
`scripts/{build.sh,source.mjs,package.sh,notices.mjs}`, `cmd/math-workshop/main.go`,
`internal/workshop/migrations.go` and `tooling/smoke.py`. Record materially changed
assumptions in decisions; preserve acceptance criteria if inputs are missing.

## Scope and invariants

- Package for the actual destination, with honest application/schema/source/version
  identity, platform metadata, checksums, embedded assets and applicable notices.
  Document signing/quarantine/launch steps appropriate to the real OS; do not
  disable global security settings or silently choose a publication license.
- Provide database-aware backup/restore. Online backup must use a coherent SQLite
  mechanism, not copy only a live main file. Check integrity and expected records;
  restore into a separate directory first, preserve the original, and handle
  permissions, unavailable paths, full disk and interrupted operations clearly.
- Exercise populated upgrades from supported prior versions, including immutable
  lessons, acknowledged drafts, assistance and attempts. Migrate transactionally,
  refuse unsupported newer schemas safely, and document recovery without manual
  schema-number edits. No silent loss or history reinterpretation.
- Preserve distinct app data identity and explicit override. Learner data stays
  private and outside source/release archives. No production data in test fixtures.
- Repeat accessibility/input checks on actual devices, including ordinary browser
  zoom, keyboard, touch, motion preferences and available screen reader. Document
  actual browser/OS and evidence separately from remaining unverified claims.
- For a separately authorized LAN part, choose a justified reachability/auth/
  transport/origin model with explicit configuration and pairing/revocation or
  comparable access controls. No wildcard bind, tunnel, auto-forward or Internet
  exposure as a convenient default. Loopback remains the default local mode.
  iPad uses a reachable server; it is not standalone offline execution.

No VPS deployment, public hosting, invitations/memberships, multiplayer or offline
sync without a separate authorized direction. No child-runtime AI. Do not force
new accounts merely to make a laptop preview usable.

## Implementation seams and evidence

Existing paths above plus `store_test.go`, browser tests and docs. Proposed backup/
upgrade CLI or UI modules and LAN configuration must be labeled as new designs
until implemented. Prefer a small documented recovery surface to a general admin
framework. Baseline commands: `sh scripts/build.sh`; `cd web && npm run test:browser`;
`uv run --project tooling python tooling/smoke.py --executable .output/math-workshop`.

Test clean install and populated upgrade on actual destination, backup under the
chosen supported lifecycle, recovery into another directory, integrity, expected
learner work, schema refusal and storage failures. Run the extracted binary outside
source with development servers stopped and inspect/block external asset requests.
Retain a minimal sanitized device checklist, version/source/package identities and
owner observations. Missing actual device/network input leaves that acceptance
item explicitly incomplete; desktop testing cannot substitute for it.

Optional Pi: focused backup/migration or LAN threat-boundary review with actual
constraints and no credentials in the packet. Optional Jev: assess recovery-copy
clarity against supplied failure scenarios with insufficient-evidence handling;
it cannot certify security or recovery correctness. Neither is required at runtime.

## Handoff and stop

Use [canonical workflow/commit authority](../.context/workflow.md). Update the goal
ledger, release/recovery docs, supported platforms and QA evidence. Record unresolved
owner/device inputs and exact resume commands. Stop after 006's scoped release checks;
do not manufacture family observations or execute 007.
