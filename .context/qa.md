# Verification entry points

[DEV-NOTES](../DEV-NOTES.md) gives build, browser, executable, packaging and source
check commands. Keep tests in source and retained results outside the checkout.
Use synthetic disposable data; never inspect or reuse an owner's database.

The baseline runs locked frontend installation, Svelte/TypeScript checks,
board/save/submission tests, asset compilation, Go race tests, vet and a Go build.
Browser fixtures launch disposable executable processes in real Chromium, block
nonlocal requests and stop only their own processes. The Python smoke helper
checks a packaged executable and optionally synthetic data created by a supplied
previous executable; no previous binary is required for ordinary baseline checks.

Reusable invariants and failure expectations:

- Counting covers all 36 ordered pairs and eleven choices, plus independent
  0–2/0–3 and zero-only definitions, invalid/null bounds and counter marks. Factor
  tests cover 1, 7, 12, 16, 24 and 36, every width/transposition, independent known
  pairs, invalid/unfinished/gapped frames and conserved arbitrary identities.
  Source-generated populated schema-1 fixtures test migration and rollback.
  A configured executable exercises alternate totals through the real rendered UI.
- Enforce ownership, immutable content/session pins and safe storage errors.
  A storage failure must never become an incorrect mathematical grade.
- Saved means acknowledged; stale writes fail atomically. Submission replay keeps
  its original identity/result and rejects changed payloads. Edits are not attempts;
  late responses cannot grade newer work or another learner.
- Exercise help, retry, switch, resume, tap, keyboard, pointer cancellation/lost
  capture, exact resize/Undo/Turn, 5×5 gaps and long horizontal/vertical rectangles.
- Inspect rendered laptop/tablet/narrow layouts, focus, target sizes, enlarged
  layout and reduced motion. Axe supplements input/visual checks.
- Export only self-contained source, build using locks, extract the package and
  test it outside source with embedded assets and no development server or remote
  page requests. Verify version, source identity, notices and byte checksums.
- Stop the test process before file-copy backup. Restore into a different temporary
  directory; check integrity and expected work. Newer schemas must fail without
  mutation. Compatibility checks preserve prior attempts and pinned session meaning.
- Check local links, stable goal paths, source boundaries and commit authority.

Investigate failed assertions without deleting or weakening them for a passing
summary. Correct a faulty driver while retaining its intended assertion. A focused
final self-review should identify concrete findings and dispositions; do not imply
independent review. Changes invalidate affected results; documentation edits alone
need not trigger unrelated runtime suites.

Implemented behavior, automated QA, owner acceptance, readiness for later work and
explicitly blocked input are different states. Host Chromium and touch emulation
do not prove actual iPad access, other browsers, native popup behavior, hands-on
screen readers, browser-menu zoom or family comprehension. Those need observed
acceptance on the relevant devices. No accessibility or educational efficacy
certification follows from automated checks.
