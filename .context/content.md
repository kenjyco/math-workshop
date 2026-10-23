# Finite content, stable meaning

`content/starter.json` defines two typed activities. New counting uses
`count-combine` revision 2 with independent operand bounds 0–5 and a derived
answer domain 0–10 on every problem. The distinct ordered opening examples come
first (5+5 is eighth), followed by every remaining pair in lexicographic order.
Each cycle covers all 36 once; orientation matters. No inferred mastery or leveling.

Factors use `factor-24` revision 2: total 24, selectable widths 1–24, initial and
worked-example width 6. Height is ceil(N/width); Turn transposes the exact current
frame. All N stable IDs must fill an N-cell rectangle. Unordered pairs are counted
from N; submitted orientations remain visible. The configured example must divide
N, and the width range must permit every pair in at least one orientation.

`rules.go` bounds operand endpoints to 0–5 and factor totals to 1–36. These named
safety ceilings differ from defaults. A count range may start/end at zero;
missing/null required bounds are errors. Configuration is checked at startup,
including opening pairs, width limits and examples. To test another finite
definition, edit a disposable source export, use a new identity/revision for changed
content, and build with fresh disposable data. The configured browser check in
[DEV-NOTES](../DEV-NOTES.md) exercises this normal path. There is no runtime importer,
public parameter endpoint or parent range/total control yet.

Learner settings are validated lesson references into the embedded definitions,
with no unused numeric override. Schema 2 replaces only the exact original seeded
settings. Other settings survive; unknown references produce a clear error rather
than silently taking defaults. Settings control new sessions. Each pins lesson,
concrete problem, effective rules, validator and application identity. The browser
receives resolved rules but submits only drafts.

`content/legacy.json` retains the original revision-1 bodies byte-for-byte.
Startup still compares immutable bodies; changed bodies require a new revision.
Known math-v1 count sessions retain their original concrete problem and 0–5 pad,
including the old total limit. Known factor-24 sessions retain 24 tiles and their
original geometry. Unknown validators or missing current rules are rejected.
Migration never rewrites session/attempt bytes. History and same-ID replay retain
original submissions/results, assistance and identities; no regrading occurs.
New feedback uses `feedback-v2`; the numeric correction needs no feedback rewrite.

For a later weekly update: adult identifies concept → original finite candidate →
deterministic checks → optional bounded semantic review → parent preview → immutable
activation for new sessions. Existing sessions remain pinned. Revision import,
activation and parent preview are **not implemented** in this foundation; goal 005
owns them. Preserve provenance/rubric/candidate identities when semantic review is
used, including disagreement and insufficient evidence. Never turn a confident
model answer into automatic classroom-method acceptance.

Standards are references, not certification or a pacing calendar. Useful reference
areas: [K.OA](https://www.thecorestandards.org/Math/Content/K/OA/),
[4.OA](https://www.thecorestandards.org/Math/Content/4/OA/) and
[4.NBT](https://www.thecorestandards.org/Math/Content/4/NBT/).
Exact teacher alignment requires actual supplied, reviewed evidence later. Keep
classroom scans, homework, school identifiers and real child histories private;
public examples and test fixtures remain synthetic and original. No prior PDFs
are dependencies. Any future separately authorized printable export is monochrome.

## Future concept relationships

The [learning principles](../NORTH_STAR.md) allow voluntary exploration ahead and
return to earlier ideas. A future progression/coverage map should distinguish a
strict mathematical dependency from a helpful supporting idea, and explain each
relationship. Concepts can form a network rather than a single chain. Standards
tags can aid reference and discovery but do not establish a mastery requirement
or unlock rule.

Use those relationships to support the small, gradual “This builds on…” exploration
described in [DESIGN](../DESIGN.md#future-learning-navigation-not-implemented).
No relationship schema, navigation or curriculum engine exists in this foundation.
The [goal index](../goals/README.md) records the proposed post-initial-release map
and later bounded activity-family work chosen from actual gaps and use; it does
not expand the existing factor, area or fluency goals.
