# 001 — Family setup and learning controls

## Outcome and definition of done

An adult can create and rename local learners, assign supported activities and
choose explicit numeric bounds with example problems. Each learner resumes only
their own acknowledged work. The younger interface remains low-reading and useful
without visiting settings each time. Done means these controls are implemented,
validated in Go, persisted and exercised through browser/API/restart tests, with
clear behavior for existing sessions and updated user documentation. It does not
mean the owner has accepted the change.

## Starting state and prerequisites

Foundation review and its explicitly authorized commit phase must be complete. Reconcile
the goal ledger and source before editing. The app already counts and combines
independent addends 0–5 with answers 0–10, explores configured tiles (default 24),
records assistance/attempts and resumes sessions. Schema 2 gives Sprout/Comet meaningful
lesson references, but has no learner editor or setting API. `Start` resolves validated
embedded definitions and pins effective rules, concrete parameters and math-v2. Do not
rebuild counting as an unimplemented task. Later current state may differ: record
changed assumptions in decisions and do not weaken acceptance retrospectively to declare
success.

Read [architecture](../.context/architecture.md), [content](../.context/content.md),
[DESIGN](../DESIGN.md), `internal/workshop/store.go`,
`web/src/components/ParentInfo.svelte` and `web/src/App.svelte`.

## Scope, behavior and invariants

- Add finite learner creation/renaming with sensible length/empty-name validation,
  activity assignment and per-activity settings. Keep all ownership checks keyed
  by stable learner IDs, never display names. Preserve history when renamed.
- Explicitly distinguish totals-through-5 (0+5 valid, 5+5 invalid) from each-addend-
  through-5 (5+5 valid, total 10). Show example problems before saving a range.
  Support only bounds covered by UI and Go validators; reject invalid/huge ranges.
- Extend the existing finite ordered-pair cycle for each adult-selectable
  range, including zero and both asymmetric orientations. Do not infer difficulty
  from speed, age, spelling ability, or a few answers.
- Settings apply to new exercises. Existing sessions retain their concrete
  parameters, lesson revision, assistance and validator identity. Changing the
  selected learner in one browser never changes another browser's learner.
- Expose an explicit motion preference that honors system reduced motion. There
  is no sound in the current product; show that honestly. Only add sound controls
  if a separately justified bundled sound feature exists, never remote audio or
  decorative nonfunctional toggles.
- Retain help before failure, large entry controls, truthful save states, stable
  counters and explicit Next. Keep adult controls outside the learner's main path.

No accounts/login, LAN setup, broad parent analytics, runtime AI, arbitrary lesson
language, adaptive mastery, spelling/typing or offline synchronization. Goal 002 owns
adult factor-total selection and the equal-group teaching extension; parameterized
totals are already a tested foundation.

## Implementation entry points and checks

Existing: `internal/workshop/{store,http,math,migrations}.go`, `web/src/lib/types.ts`,
`web/src/components/{ParentInfo,CountCombine,SessionView}.svelte`, `web/src/App.svelte`,
and tests beside these modules. A dedicated settings component and any further settings
migration are **proposed**, not existing files. Preserve immutable starter revisions; a
range change must not mutate revision 1's meaning.

Verified baseline commands (from repository root): `sh scripts/build.sh`,
`node --test scripts/commit-message.test.mjs`; browser:
`cd web && npm run test:browser`. Add focused tests for duplicate/empty names, supported
boundary combinations, unauthorized ownership combinations, simultaneous clients,
setting changes during an active session, renamed history and restart. Check
zero/maximum exercises in actual UI. Use disposable data and a populated pre-change
database migration test.

Owner input is needed for real learner names/preferences and final usability
acceptance, not for synthetic development fixtures. Do not put private names in
source/evidence. Optional Pi: a bounded review of settings/session pinning if a
concrete conflict arises. Optional Jev: judge whether candidate setting copy
clearly distinguishes the two bounds using supplied rubric/examples, with an
insufficient-evidence result. Neither replaces deterministic math checks or gates
ordinary practice; no calls are compulsory.

## Handoff and stop

Follow [workflow and commit authority](../.context/workflow.md). Update the goal ledger,
settings/content/design guidance and remaining goals against what actually ships.
Record exact tested identity, commands, failures/fixes, owner-only checks and
resume command if interrupted. Stop after this goal's outcome and QA; do not
execute 002. Human acceptance and commits require the authority specified there.
