# 007 — Improve from observed family use

**NOT READY. Required input: real owner-supplied observations of short sessions
by both learners. No such family-use evidence exists in the foundation.**

## Outcome and definition of done

Fix specific observed confusion, friction or missing classroom relevance from
actual use, with traceable evidence and focused regression checks. Done means the
owner's concrete observations are mapped to implemented changes (or explained
non-changes), the affected experiences work, and remaining goals reflect what was
learned. A small family trial is not an educational efficacy study.

## Starting state and evidence prerequisite

The foundation provides two synthetic demonstration learners, count/combine,
factor rectangles, separate saves and host QA. Subsequent goals may have expanded
them. No interviews, real child histories, usability findings or educational
outcomes can be inferred from those automated tests. Do not invent children to
interview, write fictional quotes or spend a run generating hypothetical findings.

Before implementation, ask for or locate explicitly owner-supplied observations
of both learners' short sessions: activity/version, what they tried, visible
confusion/help/interruptions and what the adult noticed. Avoid unnecessary personal
information. Keep raw notes private unless separately cleared. An anonymized
summary may inform public decisions without identifying children or schools.
Missing evidence is a real blocker for this goal, not a reason to implement guesses.

Read the goal ledger, current [DESIGN](../DESIGN.md), [NORTH_STAR](../NORTH_STAR.md),
[QA vocabulary](../.context/qa.md), the supplied observation summary, and only the
source/test modules involved. Reconcile actual accepted prior goals and current
code first. Update assumptions and scope transparently in decisions; do not
retroactively weaken acceptance to mark the goal done.

## Scope and decision method

- Separate observed behavior from adult interpretation and agent hypothesis. For
  each change record a concrete observation, plausible explanation, minimal
  product correction and a way to distinguish success from mere opinion.
- Prioritize quantity truth, unwanted friction, accidental profile/history loss,
  confusing instructions and relevant classroom relationships. Preserve finite
  mathematical contracts, exact saved work, explicit help and no mastery inference.
- Reproduce an issue with synthetic data before fixing it where possible. Avoid
  major redesign based on one ambiguous moment; uncertainty can lead to a focused
  owner follow-up observation rather than invented evidence.
- Keep younger and older experiences appropriate independently. Reading/spelling
  ability or speed in one task cannot set global ability in another subject.
- Update the future goal index and remaining detailed goals when observations
  materially alter priorities. Preserve why earlier decisions were made and why
  they changed. Owner-specified classroom examples stay private; public content
  remains original and reviewed.

No efficacy claims, diagnosis, fabricated research, broad telemetry, surveillance,
unrequested interviews, contact with classmates, automatic outreach, accounts,
network expansion or runtime AI. Do not execute deferred features merely because
feedback could hypothetically request them.

## Entry points and evidence

Existing seams:
`web/src/components/{CountCombine,FactorWorkshop,SessionView,ParentInfo}.svelte`,
`web/src/lib/{board,checkpoint}.ts`, `internal/workshop/{math,store,http}.go`,
`content/starter.json`, the associated tests and actual later-goal additions. New files
are proposals until the observation calls for them; there is no mandatory new module.
Baseline: `sh scripts/build.sh`; `cd web && npm run test:browser`. Add regression cases
for observed bugs, run relevant restored-data/restart checks if persistence changes, and
inspect affected responsive/focus paths. Do not add implementation-mirroring tests for
trivial copy edits.

Owner follow-up on the affected actual activity is needed to assess whether the
original confusion improved. Agent tests prove technical behavior, not child
comprehension. Record that distinction and any still-missing observation explicitly.
Optional Pi: consult on a concrete tradeoff the observations expose, with bounded
sanitized evidence. Optional Jev: test whether a proposed wording preserves the
concept or over-reveals a hint under a supplied rubric, including insufficient
evidence. Neither service fabricates observations, diagnoses learners or replaces
human feedback; no compulsory live calls.

## Handoff and stop

Follow [workflow/commit authority](../.context/workflow.md). Update the goal ledger with
the observation-to-change trace, exact tested source, owner findings, unresolved inputs
and exact resume action if blocked. Reconcile remaining goals, then stop. No automatic
deferred-direction work or new numbered goal is authorized by completion.
