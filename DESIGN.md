# A warm mathematical workbench

The interface uses an off-white work surface, dark green text, restrained green
and clay counters, and square unit tiles. System fonts keep numerals readable
without remote assets. Geometric learner marks are original CSS. There are no
marketing panels, scoreboard, empty future-feature buttons or decorative counters.

## Counting and combining

Sprout's screen puts “How many?”, objects and numeral choices first. Stable
counter identities are partitioned into their original groups. Marking changes
the counter's checkmark and outline, never its quantity. Together/Apart changes
group boundaries under learner control; zero has an empty group labeled 0.
Each new default addend is independently 0–5; all eleven answer choices 0–10
remain available on every problem. Legacy work retains its 0–5 pad.
Help offers one explicit count at a time, recount and encouragement to use fingers.
For 0+0, feedback describes empty groups; Help explicitly shows zero and records
worked assistance before disclosure. One empty addend refers to existing counters.
An unsubmitted numeral is only a draft. A retry keeps the exercise and its objects.
Correct feedback gives the actual equation. Next creates the next pinned exercise.

## Factor rectangles

Comet's workbench shows dimensions, the configured N-tile inventory, tray and discovered
pairs. The pair panel derives remaining and completed progress from pinned session rules
and acknowledged unique pairs. Turning shares a pair; completion leaves exploration
open. The whole frame is the proposed rectangle, including gaps. Width selection creates
`width × ceil(N/width)` and retains only in-bounds tiles. Turn transposes dimensions and
coordinates exactly, even for a gapped 5×5. Neither operation fills tiles or checks an
answer. Fill row fills only the selected row from the tray. A full row is disabled and
labeled; the Row to fill selector never advances automatically.

There is one current board per session. Returning to a previous width reshapes
that current board; it does not restore an earlier layout. Displaced tile IDs go
back to the tray, while retained IDs keep their coordinates. A compact explanation
accompanies the width selector. Actual width changes announce the displaced count
politely, with correct singular/plural and zero wording. A later board edit, Turn
or Undo clears that message. Selecting the current width or closing its native
menu without a change does nothing, including on a transposed frame.

Tap a tray tile, then an empty cell. Tap an occupied cell to select its tile, then
move it or choose Return selected tile. Enter does the same; arrows move focus
through cells, Delete returns a tile, Escape cancels selection. Pointer dragging
uses the same `place` operation only on a settled valid drop. Outside/occupied
or cancelled drops leave inventory unchanged. Tile numbers identify physical
units; their labels are not numerical tile values to add together.

Undo holds up to 50 board snapshots in this view, restoring exact dimensions and
tile-ID/coordinate mappings. Leaving the activity clears that history; only the latest
acknowledged draft resumes. Undo never removes attempts, discoveries or assistance.
Reset empties the current width's new candidate frame while keeping session history. New
practice names the active configured total (default 24) and starts a separate session.
Hint and worked example levels are recorded before disclosure; once seen they remain
recorded. A worked example uses configured dimensions (6×4 for the default 24) and still
requires an explicit Check. Rotations preserve orientation in the attempt but share a
normalized pair identity. Successful feedback states both orders using the submitted
dimensions; discovery cards show both equivalent orders without asserting that both were
physically built.

Editable cells remain 48×48 CSS pixels. Tray controls are 44×44; primary younger
controls are larger. Long shapes use a bounded scroll viewport with four labeled
pan buttons enabled only where scrolling is possible. An overflow-only SVG
overview shows the entire same frame, filled cells and gaps at the true aspect
ratio. It is labeled, noninteractive and never a second pile of tiles. Dimensions
and counts remain outside the scroller. Turn/dimension changes reveal the mapped
selected or last-focused cell (or the frame start), without moving focus away
from the control. Ordinary edits do not force a pan. Keyboard focus scrolls into
view. Horizontal shapes never wrap.

## Shared access and navigation

All controls have visible focus and accessible names. Feedback uses text and
shape as well as color, and live regions announce asynchronous results without
moving focus away from the learner's control. Zoom and ordinary page scrolling
remain enabled. There is no compulsory animation; reduced motion keeps equivalent
static instructional states.

Navigation focuses the current compact heading, programmatically focusable but
outside ordinary Tab order. Headings show a ring with `:focus-visible` for
keyboard use; pointer navigation and heading clicks keep focus without a ring.
The main landmark remains. A pending navigation/save
does not move focus after the user has moved it elsewhere. Teal outer focus rings
distinguish keyboard focus from the inset clay selected-tile mark and error boxes;
forced-color mode uses the system Highlight color. Native select focus may remain
visible after Escape. Digits are not global answer shortcuts, and native keyboard
selection is left to the browser.

## Saving and submitted work

The activity view owns local draft and selection, not accepted correctness. Saved
appears only after the latest relevant checkpoint is acknowledged. Unsaved, Saving…,
Save failed and Conflict are distinct. Done for now is a secondary action above the
activity, away from Check/Next. It returns to Home after saving, without grading,
creating a session or changing learner associations. Failed departure (including a save
still unacknowledged after four seconds) keeps the view and offers stay, retry, or
explicit departure without latest edits; conflicts never force-overwrite. Conflict
recovery can download a local draft before loading acknowledged work. The copy is a
human-readable recovery artifact, not an implemented importer. Reload opens Home;
selecting the same learner resumes acknowledged work. Transient selection, undo stack
and feedback are not promised across reload. Attempts remain visible in For grown-ups
with the pinned problem, frozen response, recorded result, assistance and time; a
correct resumed draft can be checked again to continue. Saved work and submitted answers
are separate: only Check creates an attempt, including a neutral unfinished Check.
Edits, Help and Done do not update old attempt timestamps. Later help cannot change an
earlier attempt's assistance; a subsequent intentional Check records the new assistance.
The grown-up page explains that a saved draft can be newer than its last Check.

An uncertain Check belongs to its session independently of the mounted view. Its
exact ID/payload stays in the tab journal across Done, profile changes and reload.
Retry settles that Check before another answer or help disclosure; it does not
submit newer edits under the old ID. A later confirmed Check gets a new ID. Late
responses cannot grade an edited board or another learner. Tab closure/storage
loss and crash/unload saving are not guaranteed recovery.

## Evidence and remaining limits

No full accessibility conformance claim is made. Host Chromium checks include
keyboard, touch emulation, actual pointer drags, responsive layouts, CSS zoom,
reduced motion and axe scanning. Real devices, assistive technology, family
observations and teacher-specific methods need later evidence. Those boundaries
and the further settings/content work appear in the ordered goals.

# Future learning navigation: not implemented

Following the [learning principles](NORTH_STAR.md), the ordinary learner screen
should focus on resuming the current activity and a small number of relevant
options. Progressive exploration or search, plus a fuller parent/library view,
can expose breadth without presenting a 100-item tree to a child. Younger learners
need concrete visual cues and little reading.

A future activity may offer a few “This builds on…” links, explain why each helps,
and reveal earlier prerequisites gradually. The links can branch through a concept
network; [content guidance](.context/content.md#future-concept-relationships)
distinguishes useful support from strict dependencies. Visiting an earlier idea
must preserve the current activity and offer a clear route back. Exploration ahead
and return visits are voluntary, with no forced remedial detour or inferred-mastery
requirement.

These are owner-directed design intentions, not current controls, schemas or
lessons. The proposed post-initial-release coverage work is listed in the
[goal index](goals/README.md); curriculum completeness is not a preview gate.
