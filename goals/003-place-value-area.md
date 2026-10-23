# 003 — Place value, area models and partial products

## Outcome and definition of done

A learner decomposes 23×14 into (20+3)(10+4), predicts region values, controls the
representation and connects 200, 30, 80 and 12 to a total of 322. Done means this
is a usable new finite activity with accurate proportional geometry, persisted
semantic work and independent mathematical/browser evidence. A standard algorithm
extension is optional only with explicit relevance and owner scope, not automatic
promotion after success.

## Starting state and prerequisites

The foundation already has authoritative sessions/attempts, assistance, a shared
shell, count objects and factor rectangles. It has **no** area/partial-product
activity, decomposition schema or generic lesson language. Reconcile 001/002's
actual settings and representations after foundation acceptance/authorized commits;
this new activity does not technically require an arbitrary factor curriculum.
Read [architecture](../.context/architecture.md), [DESIGN](../DESIGN.md),
`internal/workshop/{math,store}.go`, `web/src/components/SessionView.svelte`, and
`content/starter.json`. Compare this plan to current source before implementing;
record changed assumptions transparently and preserve the definition of done.

## Behavior and invariants

- Begin with pinned 23 and 14. Use learner-controlled tens/ones decomposition,
  maintaining 20+3=23 and 10+4=14. Show lengths proportional to these quantities,
  not four visually equal regions. Keep readable labels outside small regions
  where necessary; no misleading magnification of a mathematical side.
- The regions are 20×10=200, 3×10=30, 20×4=80 and 3×4=12. Their arrangement must
  agree with labeled sides and sum to 322. Go computes/checks the complete
  supported finite contract independently from SVG/DOM presentation.
- Let learners predict, inspect, go Back/Next and Replay. Navigation is not an
  answer attempt. Replay and reduced-motion static states convey the same
  quantities. Avoid animation-only reasoning and preserve representation state
  across acknowledged resume.
- Include supported zero parts such as 20+0 or 10+0. A zero-width/height part
  contributes zero area, not a phantom visible unit region. Maintain text
  accessibility for omitted geometric area and distinguish incomplete input from
  an incorrect submitted prediction.
- Separate assistance and correctness, allow retries and explicit worked examples,
  preserve lesson/validator identity, and make answer snapshots idempotent. Keep
  the original activities and their save ordering intact.
- Explain distributions and partial products without assuming a specific teacher's
  terminology. Add a standard algorithm only with a concrete reviewed reason and
  transparent scope change, never as an automatic next level or mastery inference.

No full curriculum, general algebra parser, handwriting/photo grading, PDFs,
canvas engine, runtime AI, accounts, LAN exposure or independent offline iPad.
Do not force this denser activity into the younger learner's default screen.

## Proposed additions, existing seams and QA

Proposed: an activity-specific `AreaWorkshop.svelte`, finite structured lesson data
and Go area validator/tests. These files do not yet exist. Existing seams are
SessionView's activity dispatch, `types.ts`, Start/ValidateDraft/Evaluate and the
shared migration/pinning contract. Refactor dispatch only as much as clarity needs;
do not build an extensible lesson interpreter.

Run `sh scripts/build.sh` and `cd web && npm run test:browser` plus focused new
unit cases. Independently assert 23×14=322 and each labeled region, swapped
orientations, zero parts, invalid decomposition sums, missing inputs and bounded
values. Check actual DOM/SVG geometry ratios within an explained pixel tolerance,
label readability at narrow/zoomed sizes, keyboard/tap control, Back/Replay,
reduced-motion equivalence, reload, stale writes and late-response isolation.
Retain a small screenshot set that makes the proportional geometry reviewable.

Actual classroom material is an input for precise teacher-method alignment only;
keep it private and use original public examples. Owner/device acceptance remains
separate. Optional Pi: focused proportional-layout or persistence design review
with a concrete failure. Optional Jev: judge whether supplied explanation variants
preserve the intended concept under a versioned rubric; allow insufficient evidence.
Jev never supplies arithmetic truth or a requirement for child use.

## Handoff and stop

Use [workflow/commit authority](../.context/workflow.md). Record real behavior, source
identity, validation and owner/classroom unknowns in the goal ledger, design and content
guidance. Give exact resume commands if interrupted. Reconcile subsequent goals with
actual new paths. Stop after this outcome and QA; do not execute 004.
