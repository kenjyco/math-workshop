# 002 — Factor and equal-group exploration

## Outcome and definition of done

A learner explores a finite supported set of totals as equal groups and complete
rectangles, distinguishes factors from factor pairs and can search systematically
without a mandatory walkthrough. Done means supported totals include 1, a prime
and a square, all legal orientations are checked independently, and the original
fixed-24 interaction/persistence guarantees remain true. New explanations and
hints are available alongside independent manipulation and are browser-checked.

## Starting state and prerequisites

Accept/commit the foundation under owner authority, then reconcile goal 001's actual
controls. The existing workshop already supports configured N distinct tiles (default
24), tap, keyboard, drag, row fill, undo, exact rotation, resizing, gap feedback and
saved pair discoveries. `board.ts` and `math.go` consume pinned rules; totals 1–36 are
bounded, with 1, 7, 12, 16, 24 and 36 covered by independent fixtures. Pair counts are
computed from N and discoveries come from attempts. Do not replace this usable slice
with a static lesson.

Read [DESIGN](../DESIGN.md), [content](../.context/content.md),
`internal/workshop/math.go`, `web/src/lib/board.ts`,
`web/src/components/FactorWorkshop.svelte`, and their tests. Reconcile all planned
assumptions with current files before implementing; record material changes in
[decisions](../.context/decisions.md). Do not retroactively reduce acceptance.

## Scope and mathematical contract

- Expose a documented finite set from the parameterized foundation, with
  explicit adult selection. Bound tile count/dimensions to usable tested layouts.
  Retain existing rule/total/revision pins in every new session; old sessions keep
  their own totals. Parameterization itself is already implemented.
- Exactly N identities exist in tray or board. Width selection produces
  `w × ceil(N/w)` without placement. A rectangle succeeds only when all N allowed
  tiles occur once and every frame cell is occupied. Retain gap/unfinished feedback.
- For 1, discover only (1,1); a prime has only (1,p); a square's square pair is
  recorded once. Rotation is valid and repeated, never an extra discovery. Show
  factors (individual divisors) separately from unordered pairs (two dimensions).
- Connect equal groups, rows and symbolic multiplication using the same quantity.
  Predictions and explanations must not silently move tiles, auto-submit or
  count a dimension choice as a solution. Learner-controlled example moves need
  explicit assistance disclosure and equivalent reduced-motion states.
- Offer a small systematic-search aid and graded hints: notice equal rows, test
  a candidate, then an explicitly assisted worked arrangement. Preserve help
  history through undo/reset/conflict. Do not force hints or a tutorial sequence.
- Preserve full-size 1×N/N×1 editing with pan buttons, keyboard focus scrolling,
  touch path and actual pointer cancellation. Retain in-bounds tiles on resize;
  turn existing cells/frame exactly. Keep reset versus new-session semantics clear.

No teacher-specific named method without supplied evidence. No unrestricted total
editor, area/partial-product implementation (003), runtime AI, timed economy,
accounts, networking or arbitrary curriculum interpreter.

## Entry points and evidence

Existing: `content/starter.json`, `internal/workshop/{math,store}.go`,
`web/src/lib/{board,types}.ts`, FactorWorkshop and SessionView, Go math/store tests,
board property tests and `web/tests/foundation.spec.ts`. A grouped-quantity view
and additional finite lesson revisions are **proposed**, not existing modules.
Avoid a generic rule engine just to parameterize N.

Baseline: `sh scripts/build.sh`; `cd web && npm run test:browser`.
Add independent enumerations for each supported total, primality/square edge
examples, every orientation, invalid identities/cells/dimensions, partially filled
and gapped frames. Exercise cross-total resume, old-content pinning, monotonic help,
replayed submissions and exact rotations with non-symmetric gaps. Inspect actual
long shapes at laptop/tablet/narrow sizes and reduced motion. Use only temporary
synthetic learner data.

Owner/classroom input is required for exact method alignment and observed
comprehension. General equal-group explanations can be original. Optional Pi:
review a specific conservation/normalization issue with code and counterexample.
Optional Jev: over-revealing hint classification against an explicit hint rubric,
including insufficient evidence. Arithmetic and pair identity stay deterministic;
no optional model/provider is required to run lessons or baseline checks.

## Handoff and stop

Follow [canonical workflow/commit authority](../.context/workflow.md). Update content,
DESIGN, the goal ledger and future goals to the actual supported totals, source
identity, checks and remaining input limits. An interruption handoff gives exact resume
commands and unresolved cases. Stop after this goal; do not begin 003 or claim owner
acceptance from automated checks.
