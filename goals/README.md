# Goal index and completion ledger

This is the single index and completion ledger. Goal files retain their stable paths;
completed goals are not archived or renumbered.
[Workflow](../.context/workflow.md#goal-execution-and-authorized-closeout) owns
authority and closeout. No numbered goal has run or been marked complete.

## Current ledger

The foundation delivers independent 0–5 count/combine and parameterized factor
rectangles (default 24), local profiles, SQLite saves, adult attempt inspection and host
packaging tools. The foundation is completed and recorded following owner acceptance
on 2026-10-23 and the authorized implementation commits below. Numbered work still
requires its own explicit assignment. Adult preview feedback is not family-use evidence.

| Goal | Stage and prerequisites | Owner acceptance | Implementation commits |
| --- | --- | --- | --- |
| Foundation | Completed and recorded | Accepted 2026-10-23 | [A and B](#foundation-closeout--2026-10-23) |
| [001 — Family setup](001-family-setup.md) | Planned; foundation prerequisite met; execution not authorized | Not requested | None |
| [002 — Factors and equal groups](002-factors-and-groups.md) | Planned; reconcile actual 001 settings | Not requested | None |
| [003 — Place value and area](003-place-value-area.md) | Planned; reconcile prior controls after foundation acceptance; arbitrary factors not required | Not requested | None |
| [004 — Fluency and history](004-fluency-history.md) | Planned; choose facts/ranges from implemented settings and observed needs | Not requested | None |
| [005 — Weekly content updates](005-classroom-content.md) | Planned; exact classroom alignment requires supplied evidence | Not requested | None |
| [006 — Portable family release](006-portable-release.md) | Planned; actual destination/device/network details needed | Not requested | None |
| [007 — Observed family improvements](007-observed-use.md) | Blocked; real short-session observations from both learners needed | Not requested | None |

## Completion records

### Foundation closeout — 2026-10-23

The owner explicitly accepted the foundation in the 2026-10-23 closeout instruction,
having reviewed the application, corrected counting activity, all four factor pairs,
saved progress and final readability changes. The owner approved the initial A/B
commit structure and exactly one documentation closeout commit in this session.
This one-time exception leaves the standing no-commit restriction in force for future
tasks. No numbered goal was executed or completed.

Delivered scope includes independent counting addends 0–5 with answers 0–10,
server-resolved parameterized factor rectangles with default total 24, local synthetic
profiles, help, saved drafts, submitted-attempt history and persisted factor discoveries.
Go owns mathematics, session rules and SQLite persistence; the embedded Svelte interface
owns transient interaction. Immutable legacy lessons, pinned sessions and recorded
attempts retain their meaning. Host build, source export and packaging tools, reusable
tests and durable guides complete the foundation; adult setup and later teaching
extensions remain numbered work.

Implementation commits:

- A: `c710d79c7647adc0162594ec67fcf1aa41e969dc` — Implement math rules and local
  persistence.
- B: `cfb0a450b62676b18c7fa82424e8e8020e51d41a` — Add the interactive packaged math
  workshop.

Closeout verification matched the exact 15-file A and 71-file B sets to the approved
source inventory. A's exact staged-source export passed Go race tests and vet. The
cumulative tree passed the normal locked build, Svelte/TypeScript checks with zero
errors or warnings, all 17 frontend unit tests, Go race tests, vet, executable build,
documentation/source checks and all four tooling tests. The executable smoke passed
with disposable synthetic data, including both activities, replay/conflict behavior,
draft/attempt separation, persisted discoveries, stopped-app backup/restore, integrity
and newer-schema refusal. An initial sandbox cache-access failure was resolved by
rerunning vet with the explicitly supplied external Go cache and required access;
no source diagnostic or check weakening was involved.

Remaining limits: browser suites were preserved but not rerun for this closeout.
Actual iPad, other-browser and assistive-technology checks, browser-menu zoom and
observed family use remain unverified. Local profiles are not authentication; network
pairing, accounts, multiplayer, offline synchronization, online backup and populated
upgrade tooling remain outside the foundation. Public VERSION remains 0.1.0; no new
release package or publication was made. Previous releases, including the immutable
owner-tested 0.1.0-dev.4 artifact, and owner data remain unchanged. Source acceptance
does not certify destination portability, accessibility or educational efficacy.

A goal may span several commits and a commit may contribute to several goals.
Record actual IDs; a metadata commit need not contain its own hash. Never invent
approval or infer completion from a commit or an agent status banner.

## Executing and adding goals

Read the entire authorized goal and reconcile its prerequisites with source.
The practical order can change without renumbering stable IDs. Record justified
scope/order changes in [decisions](../.context/decisions.md), preserving acceptance
criteria. Future bounded goals use the next unused ID (currently 008), with actual
dependencies and a stopping point. No goal automatically starts another or grants
commit authority. Current definitions do not authorize execution by themselves.

## Later directions, not execution commitments

- **Mathematical progression and coverage map**, proposed after the initial release:
  identify real gaps and useful concept relationships, then select bounded
  activity-family work from those gaps and observed use. Follow the owner direction in
  [NORTH_STAR](../NORTH_STAR.md),
  [future navigation design](../DESIGN.md#future-learning-navigation-not-implemented)
  and [content guidance](../.context/content.md#future-concept-relationships). This does
  not expand 002–004 or make curriculum completeness a preview gate; a numbered
  execution goal can be authored later from actual repository needs.
- **Toolchain support before distribution or hosting:** review target-platform and
  dependency support using [DEV-NOTES](../DEV-NOTES.md). Actual destination/device
  validation remains separate; changing a compiler never updates an existing package.
- Hosted adult invitations/one-time login codes, family membership, privacy and
  deletion/export operations need an explicit deployment/authorization model.
- Authorized cooperative or versus realtime play needs actual household/game
  requirements; no accounts or room infrastructure is a hidden prerequisite.
- Spelling and typing require independent subject-specific learner settings.
- Optional separately authorized print exports should be monochrome.
- Standalone offline iPad synchronization needs a separate conflict/security design.
- The marimo/programming/data lab remains separate.

Current behavior and limits are described in [DESIGN](../DESIGN.md) and
[QA](../.context/qa.md). Future intentions never count as implemented capabilities or
completed checks.
