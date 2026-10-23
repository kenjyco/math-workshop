# Actual architecture

A single loopback Go process serves embedded Vite/Svelte assets and a same-origin
JSON API. `cmd/math-workshop/main.go` chooses the data directory and listener.
`web/assets.go` cannot compile from a clean tree until `web/dist` exists; the
build script checks/builds the frontend first. No Node server, SSR or runtime AI.

## Client and mathematical authority

The browser owns the selected learner **per mounted view**, selection, drag state,
focus and undo. There is no server-global current learner and no login. API routes
include both learner and session IDs; storage checks the ownership relationship.
The home screen intentionally asks which learner on reload. Each resumes their
latest persisted session. Adult information is local navigation, not authentication.

Go owns starter sequence selection, parameters, lesson revision, validation and
accepted records. The only mutable inputs to checks are activity-specific drafts.
Unknown fields and noninteger coordinates fail JSON decoding/validation. The tray
is the complement of allowed tile IDs 1–N, so no separate inventory can drift.
A width-generated frame or its transposition is permitted; success additionally
requires exactly N occupied cells and an N-cell frame. A partially filled frame
is neutral unfinished work. A full inventory in 5×5 is a retry with a visible gap.

## Saving, navigation and submissions

`Checkpoints` coalesces edits over 220 ms, sends one snapshot at a time, and uses an
expected version. `Save` validates and updates in a transaction with an atomic
version predicate. Conflicts preserve local work until explicit recovery. The UI
uses an acknowledged version separately from the local edit serial. “Saved” never
means a merely queued request. Navigation flushes or offers a bounded stay/retry/
leave-without-latest-edits choice; a four-second wait does not cancel an in-flight
request or claim that it failed to reach storage. An
unload warning is best-effort, not a crash-save guarantee.

Navigation focuses a compact view heading instead of the large main landmark.
The bounded departure operation observes focus moves while waiting, so delayed
loads/saves do not take focus back from a newer user choice. The existing
stay/retry/explicit-departure and session-bound submission paths remain separate.

Check freezes an exact draft and local edit serial with a UUID. Submission is
independent of autosave and does not mutate the draft. SQLite stores the canonical
payload and response transactionally. Same ID/payload replays; changed content or
another session conflicts. Response session/ID/serial must match. Newer edits do not
receive old grading; unmounted views receive no updates. A lost response is retried with
the same frozen payload and ID even if the view closes or newer local edits exist. App
owns the per-session submission coordinator; a sessionStorage journal retains uncertain
checks across ordinary tab reloads. A new Check/help disclosure waits for that
uncertainty to settle. Replaying the earlier answer cannot label a different current
draft. Tab closure or lost browser storage is not promised recovery.

Help disclosure is a monotonic session field persisted via its own endpoint before
showing the hint/worked example. This deliberately avoids placing help inside an
undoable draft. Every attempt captures the assistance known when it was accepted.
Discoveries are queried from recorded correct results, not a separate badge count.

## Storage and compatibility

SQLite uses `database/sql` and modernc's pure-Go driver. One connection, foreign keys
per connection, a 5-second busy timeout and default rollback journal keep local behavior
comprehensible. Mutating multi-step operations use transactions. `migrations.go` uses
numbered `user_version`; newer schemas fail before writes. The starter revisions are
immutable via triggers and compared at startup. Tables: households, learners with
validated lesson references, lessons, pinned sessions and attempts. Sessions retain
validator/application identity; attempts reference those pins and store their exact
submitted drafts. History joins immutable session parameters and decodes the original
clientVersion/canonical-Draft payload, never current settings/drafts or result prose.
Newly generated messages carry feedback-v2 on the stored result; existing result bytes
and math-v1/lesson pins stay intact. Schema 2 transactionally replaces only recognized
original seeded settings with lesson references. New sessions pin effective rules inside
parameters and use math-v2; a narrow math-v1 resolver reconstructs recognized revision-1
rules without rewriting stored parameters. Save and Check validate through that resolved
context. The API exposes derived answer bounds and pair counts to the browser. No
speculative accounts, rooms or plugin tables.

## Loopback service and packaging

The server allows its exact numeric loopback Host and optional matching Origin;
mutations also require a custom header and JSON content type. Bodies are capped
at 16 KiB. There is no CORS. CSP restricts assets and connections to the same
origin. Storage failures return operational errors and never incorrect grades.
Do not treat these controls or profiles as security against a local computer owner.

A manifest-identified host executable embeds assets/content. Mutable data stays
outside release/source. Only stopped-app file-copy backup is documented now.
Online backup, populated upgrade tooling, destination portability, LAN access and
actual iPad operation belong to goal 006. No general lesson interpreter or importer
is hidden in the foundation.
