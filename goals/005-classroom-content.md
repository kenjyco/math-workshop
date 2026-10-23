# 005 — Weekly classroom-informed content updates

## Outcome and definition of done

An adult can take an identified concept through an original candidate revision,
deterministic validation, optional bounded semantic review and parent preview,
then activate an immutable supported lesson revision for new sessions. Invalid
packs fail atomically, and old work keeps its meaning. Done means this actual
workflow works for the implemented finite activity contracts with checked imports,
revision pins, error messages and a documented optional development-side Jev path.

## Starting state and prerequisites

`starter.json` is embedded structured data. `lessons` are immutable, sessions pin
IDs/revisions/effective rules/parameters/application/validator, and tests protect
those pins. Typed bounded counting/factor definitions and learner references already
exist; math-v1 compatibility and immutable legacy bodies remain supported.
There is **no** import, editor, activation UI or semantic-review script. Reconcile
which activity contracts earlier goals actually added; support only those with
concrete validators. Foundation acceptance and authorized commits precede work.
Exact teacher-method alignment is blocked on owner-supplied private evidence;
generic original finite packs can be developed without claiming that alignment.

Read [content](../.context/content.md), [workflow](../.context/workflow.md),
`content/starter.json`, `internal/workshop/{store,math,migrations}.go`,
`tooling/pyproject.toml` and the relevant activity component. Reconcile the goal
with current repository reality first; record changed scope/order in decisions
and never weaken acceptance retrospectively.

## Contract and workflow

- Extend the existing finite per-activity contracts for import with explicit lesson IDs,
  revisions and provenance. No executable HTML/JavaScript, arbitrary lesson
  language or unbounded expression interpreter. Require all referenced assets
  to be bundled/authorized and reject unsupported activity or validator versions.
- Author/check/preview/import a whole pack. Validate before a transaction; reject
  an invalid member without partially importing other members. Reject a changed
  body under an existing ID/revision, while treating an identical retry safely.
- Activation affects only new sessions. Existing sessions and attempts keep old
  parameters/content/validator meaning. Explain selection/activation errors to
  adults without grading children incorrectly. Back up disposable populated data
  when testing migrations.
- Parent preview is a distinct step that shows the exact candidate and example
  problems. A model approval cannot activate content or stand in for parent review.
- Keep classroom source files and identifiable observations private. Public tests
  use original/synthetic excerpts, with permission/provenance rules documented.
  Do not inspect old homework/PDFs or external repositories as implicit inputs.

## Optional Jev semantic-review workflow

Provide a small optional helper within the single existing uv project, following
current official TypeSafe documentation at implementation time. It can judge
method alignment, hint over-reveal, supported topic labels or concept preservation
only over supplied evidence. Each independent question gets a finite typed outcome
including insufficient evidence; compose downstream decisions in code. Confidence
is not mathematical proof. No photograph-grading or raw-source publication claim.

Include a labeled original example set with desired outcomes, exact source/
candidate/rubric/interface identities, bounded inputs, saved results and owner
adopt/reject disposition. Demonstrate absent credentials, timeout, malformed or
failed response, abstention and disagreement handling without blocking baseline
checks. Offline fixtures must be clearly labeled; a live run requires a concrete
uncertainty, current interface, existing authorized credentials and approved inputs.
No mandatory call count, credential installation or provider integration in the
child app. Python remains development-only; Go validates production packs/math.

Optional Pi is appropriate for a specific atomicity/pinning design uncertainty,
with a bounded consultation packet and observed model resolution. It is neither
a universal reviewer nor a replacement for deterministic checks.

## Entry points and evidence

Existing: Go storage/API/math modules and tests, ParentInfo, content data, tooling
project and smoke helper. Proposed: finite pack validation/import endpoints,
parent preview controls and optional `tooling/review_content.py`; these do not
exist now. Avoid a general content-management system.

Run `sh scripts/build.sh`, `cd web && npm run test:browser`, and focused pack/helper
checks. Include all-or-nothing import, duplicates, changed revision, malformed types,
unsafe markup/paths, unsupported contracts, pinned old sessions, simultaneous
activation/new session and storage-failure cases. Verify parent preview matches
the exact activation candidate. Add a private owner walkthrough when sources exist;
record exact alignment as unverified until reviewed rather than guessing.

## Handoff and stop

Follow [commit authority](../.context/workflow.md). Update content guidance and the goal
ledger, record deterministic versus semantic versus human decisions separately, and give
exact resume commands plus blocked evidence inputs. Stop after 005 and its QA; do not
deploy or begin 006 automatically.
