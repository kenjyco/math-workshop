# 004 — Fluency games and useful practice history

## Outcome and definition of done

Children can choose short finite practice rounds suited to their actual selected
content, with untimed default, optional timing, help, pause and exit. An adult can
see observed first answers, retries, assistance and active time without an invented
mastery score. Done means round state survives normal interruption, relationships
are taught alongside retrieval, and both younger and older content paths have
checked usable sessions and truthful history.

## Starting state and prerequisites

The foundation has untimed counting/factor sessions, exact submissions and a recent
50-attempt list in ParentInfo. It has no round engine, timer, active-time accounting,
flashcards, aggregate analytics or mastery model. Reconcile the actual range controls
and added activities from earlier accepted goals; do not assume 003 is required for
simple fact practice. Foundation owner acceptance and authorized history are
prerequisites. Read [NORTH_STAR](../NORTH_STAR.md),
[architecture](../.context/architecture.md), SessionView, ParentInfo, `store.go`, and
`http.go`. Update assumptions against source before editing; preserve acceptance rather
than narrowing it after failures.

## Scope and behavior

- Add finite parent-selected fact sets/ranges with sample items and bounded round
  length. Use genuinely appropriate content for both activity groups, not global
  age-based placement. Prefer reuse of existing checked numeric contracts.
- Untimed is the default. Timing is explicit and optional, with pause/exit visible;
  never make speed a diagnosis, reward economy, streak penalty or automatic
  difficulty increase. The learner can stop without losing acknowledged work.
- Define active time precisely: pause, hidden-tab time, background/sleep and exits
  must not silently count as practice. Store a limited useful semantic record;
  do not log keystroke/pointer streams. Explain uncertainty after abrupt termination.
- Identify first submitted answers, subsequent retries and disclosed assistance.
  A local numeral choice is not a first answer. Idempotent replay never duplicates
  an attempt; operational storage errors never become wrong answers.
- Teach commutativity, doubling and decomposition as relationships, with optional
  untimed explanations between recall items. Provide help before error and a way
  back from examples. Assistance stays attached to the appropriate item/round.
- Present observed counts and examples with clear denominators. Neutral unfinished
  constructions are not wrong answers. Do not fabricate mastery, diagnostic labels
  or a cross-subject ability level from sparse results or active time.
- Keep current direct exploratory activities available; rounds do not replace them.

No high-stakes assessment, classroom ranking, compulsory speech, remote audio,
network multiplayer, accounts, runtime AI or full analytics platform. A new
round model must be small and activity-specific rather than a game framework.

## Entry points and QA

Existing: `internal/workshop/{store,migrations,http,math}.go`, SessionView,
ParentInfo, `types.ts`, checkpoint tests and browser fixtures. Proposed: a small
practice-round component/finite round record and a migration if needed. These
are future additions, not current paths. Preserve historical session identity
and make any populated migration verifiable.

Baseline commands: `sh scripts/build.sh`; `cd web && npm run test:browser`.
Add deterministic tests with controlled time for pause/resume, hidden tab,
interruption, repeated IDs, retries and empty/finished rounds. Exercise a younger
and older round through keyboard/tap, incorrect answer/help/retry, explicit exit,
reload and storage failure. Independently audit history denominators against
recorded attempts and verify no unanswered draft is counted. Check timing display
and focus at narrow/zoomed layouts and reduced motion; avoid flaky sleep-based
assertions when a clock can be controlled.

Owner observations should inform round length and friction; do not invent them.
Optional Pi: bounded review of time/attempt accounting when a concrete edge case
is unclear. Optional Jev: semantic review of hint over-reveal or claim wording
against a supplied rubric, including insufficient evidence. No live call is
compulsory, and neither service owns math or runtime practice.

## Handoff and stop

Follow [canonical workflow/commit authority](../.context/workflow.md). Update the goal
ledger, current behavior/docs, schema and later goals; report exact source/test
evidence, remaining owner inputs and resume steps. Stop after 004. Do not automatically
implement content import or goal 005.
