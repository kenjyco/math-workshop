# Authority and collaboration workflow

## Canonical commit authority

**No staging or commits are authorized.** Read-only Git inspection is allowed.
Do not create hidden checkpoints, commit-tree objects, temporary branches, tags,
remotes, publication or deployments. Passing tests and automated approval supply
neither human acceptance nor commit authority. Future goals inherit this boundary
until the owner explicitly changes it. Ordinary scoped edits and tests need no
repeat permission. No goal branches/PR policy has been selected.

After explicit authorization, make a few coherent, testable commits. Keep changes
readable and surgical. Run relevant QA before committing; inspect the exact staged
diff and verify a staged-source export if unstaged fixes would affect the result.
Use file-level or partial staging where meaningful. Do not create broken intermediate
commits merely to reduce their size.

Use imperative descriptive subjects, preferably at most 50 characters, with no
trailing period. Separate the body with a blank line; wrap ordinary body prose at
72 columns. Explain reasons and relevant verification. Unbreakable references may
exceed the body limit. `node scripts/commit-message.mjs /tmp/proposed-message.txt`
checks formatting; `node --test scripts/commit-message.test.mjs` checks the checker.
Neither command installs hooks or judges meaning for the reviewer.

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

Codex owns integration, verification and handoff. Use a higher-reasoning model for
ambiguous design/integration and an implementation model with suitable effort for
well-specified work. A task prompt does not itself switch the selected model.

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
existing authorized credentials for live calls. Jev is not the arithmetic oracle,
universal reviewer or learner-runtime gate. Human acceptance remains separate.

## Fresh session and interruption

Read the active assignment, this index's relevant guidance and the specific goal
if one is authorized. Workspace instructions may identify optional external status
and run records; these are never build inputs. Reconcile files, tests and live
processes before editing. On interruption, update that external handoff with real
changes, checks, remaining uncertainty, the next action and owned process handles.
A failed observation does not prove a process stopped; recheck the same handle.
Use synthetic disposable data. Private owner material and other applications are
not implicit inputs. No later goal starts automatically.
