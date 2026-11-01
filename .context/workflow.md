# Authority and collaboration workflow

## Canonical commit authority

**No staging or commits are authorized.** Read-only Git inspection is allowed.
Do not use alternate indexes or create hidden checkpoints, commit-tree objects,
branches, tags or remotes; do not initialize Git, switch branches, amend or rewrite
history, change remotes, push, publish or deploy. Passing tests and automated approval
supply neither human acceptance nor commit authority. Past one-time authorizations
do not carry forward. Future goals inherit this boundary until the owner explicitly
changes it. Ordinary scoped edits and tests need no repeat permission. No goal
branches/PR policy has been selected.

After explicit authorization, keep one understandable conceptual change per commit;
a goal may need several coherent, testable commits. Include relevant tests and directly
supporting documentation with the source change. Keep changes readable and surgical.
Run relevant QA before committing; inspect the exact staged diff and verify a
staged-source export if unstaged fixes would affect the result. Use file-level or
partial staging where meaningful. Do not create broken intermediate commits merely
to reduce their size.

Use imperative descriptive subjects, preferably at most 50 characters, with no
trailing period, opaque agent/session identifiers or mechanical goal-number prefixes.
Separate the body with a blank line; wrap ordinary body prose at 72 columns. Explain
reasons and actual verification without overstating acceptance. Unbreakable references
may exceed the body limit. `node scripts/commit-message.mjs /tmp/proposed-message.txt`
checks formatting; `node --test scripts/commit-message.test.mjs` checks the checker.
Neither command installs hooks, judges meaning for the reviewer or authorizes Git
writes.

## Markdown prose and Go layout

Soft-wrap ordinary authored Markdown prose at approximately 88 columns as a soft
upper bound. Keep readable lines around 80–88 columns; do not pad or reflow them
for uniformity. Include prose in lists and blockquotes while preserving indentation,
paragraph boundaries and intended rendering.

Exclude tables, fenced or indented code, commands/snippets, literal examples and
deliberate hard line breaks. Never split or rewrite links, URLs, code spans or
other indivisible tokens just to meet the width. A whole link may end a long line
or move to the next source line in the same paragraph. Preserve link targets,
heading text unless explicitly reorganizing it, meaningful whitespace, file paths,
code examples and quoted content. Use focused review and existing link/structure
checks; no mandatory Markdown formatter is required.

Go uses gofmt, without a Markdown or Python-style line-length limit. Hand-expand
unusually dense constructs where useful, then accept gofmt's layout. Commit-message
prose still wraps at 72 columns with the subject convention above.

## Goal execution and authorized closeout

[The goal index](../goals/README.md) is the single completion ledger. Keep numbered
files at their stable paths; do not archive or renumber them, invent commit prefixes
or install closeout hooks. New bounded goals use the next unused ID, even if their
execution order changes. Reconcile prerequisites with code and actual needs.
Preserve acceptance criteria; record justified scope changes in decisions.

Stages are planned/blocked → active → QA-checked, awaiting owner review → owner
accepted, awaiting authorized commits → completed and recorded. An agent's “Goal
achieved” message or a commit alone supplies neither owner acceptance nor QA.
Only record approval actually supplied by the owner. During authorized closeout,
record the outcome, acceptance, explicit relevant implementation commit IDs and
remaining follow-up. IDs are recorded only after they exist; one goal can span
several commits and one commit can contribute to several goals. No metadata commit
needs its own hash. No goal automatically starts the next.

## Model and consultation roles

The implementing agent owns integration, verification and handoff. The owner's model
preferences assign these responsibilities:

- **GPT-6 Astra xhigh:** consequential architecture, difficult investigations and
  planning that creates or revises several related ordered goals. This is not a
  mandatory planning step before each implementation goal.
- **GPT-6.1 Sol medium:** primary implementation of bounded goals, integration,
  appropriate tests and verification reporting.
- **GPT-6.1 Terra medium:** focused documentation and source refinement, review of
  accepted work, and preparation or creation of human-readable commits only after
  explicit owner authorization. New substantive changes need their own appropriate
  review.
- **GPT-6 Luna high:** small, well-specified supporting work such as inventories,
  targeted exploration, extraction and suitable mechanical transformations.

Prefer deterministic tools for reliably mechanical operations. These are workflow
preferences, not claims that every configuration is validated or available locally.
A document or task prompt does not switch a running session's model.

Optional focused Pi consultation is useful for a concrete uncertainty. Verify its
current supported interface/model availability; keep authority read-only or narrowly
scoped. Supply the relevant code, observations, constraints and discriminating
question. Disable tools/extensions/MCP for tool-free advice. Record the recommendation,
uncertainty and adopted/rejected disposition in optional external run records.
Consultation does not transfer integration responsibility or authorize commits.
There is no compulsory delegation, recursion or demonstration call count.

Optional Jev judgments can classify a narrow semantic question over supplied
material with an insufficient-evidence result. Keep independent questions separate;
compose results in deterministic code. Use current official documentation and
separately configured, authorized credentials for live calls. Jev is not an arithmetic
oracle, required reviewer or learner-runtime dependency. Human acceptance remains
separate.

## Fresh session and interruption

Orientation is the opening part of authorized work, not a separate session or approval
gate:

1. Read [AGENTS](../AGENTS.md), [NORTH_STAR](../NORTH_STAR.md) and the relevant entries
   in the [context index](INDEX.md).
2. Read the active assignment and the complete explicitly authorized goal, if any.
3. Verify the repository root, branch, working and staged state, and recent history.
   Identify and preserve pre-existing changes. Reconcile the goal's prerequisites and
   starting assumptions with the ledger and relevant source/tests.
4. Consult the specific design, architecture, content and QA guidance needed for that
   goal. Reading every context document or historical report is not a prerequisite.
5. Proceed with the authorized work and proportionate verification through its stated
   stopping point, unless a genuine blocker prevents safe progress. A goal specification
   does not authorize itself or the next goal.

Goal authors can reuse this short instruction, followed by task-specific entry points:

> Follow [fresh-session orientation](../.context/workflow.md#fresh-session-and-interruption)
> as part of this authorized goal. Reconcile its assumptions with current Git state and
> source, then implement and verify its scope through the stated stopping point.

When authorized implementation materially changes architecture, product behavior,
content contracts, verification requirements or goal assumptions, update the relevant
durable guidance alongside the work. Use the [context index](INDEX.md) to find its
authoritative home and link from other guides; trivial edits need no documentation
ceremony.

Workspace instructions may identify optional external status and run records. They
help resume work but never replace source or the goal ledger, and are not required
to understand, build or check a standalone clone. Historical prompts are not mandatory
steps. On interruption, reconcile files, tests and live processes; update an available
external handoff with real changes, checks, remaining uncertainty, the next action and
owned process handles. A failed observation does not prove a process stopped; recheck
the same handle. Use synthetic disposable data. Private owner material and other
applications are not implicit inputs.
