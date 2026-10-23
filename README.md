# Math Workshop

Math Workshop is family mathematics software: a playful place to manipulate
quantities, explain relationships and practise ideas. Help, retries and returning
to an earlier idea belong in that experience.

Synthetic learner Sprout counts and combines independent addends 0–5 (answers 0–10);
Comet builds rectangles with 24 tiles by default. Both activities are untimed, offer
explicit help and save separate learner work locally. The grown-up view shows submitted
attempts. A packaged executable needs only a browser and writable local storage.

From an extracted package, choose a data directory and open the printed local URL:

```sh
./math-workshop --data-dir /path/to/my-workshop-data --port 0
```

Stop with Ctrl-C. See [DEV-NOTES](DEV-NOTES.md) for building, checks and packaging.
[Product principles](NORTH_STAR.md), [interaction design](DESIGN.md) and the
[goal index](goals/README.md) distinguish current behavior from future work.

## How the pieces fit

| Piece | Job in this application |
| --- | --- |
| Go | Serves HTTP, chooses exercises, validates answers and owns persistence. |
| SQLite | Stores learners, pinned sessions, acknowledged drafts and attempts locally. |
| Svelte | Renders components and manages immediate browser interaction state. |
| TypeScript | Checks browser logic and contracts; Go validates incoming requests. |
| DOM, CSS and SVG | Draw counters/tiles and a same-shape overview for long rectangles. |
| Vite | Builds browser assets that Go embeds in the executable. |
| Node/npm | Run frontend checks/builds; there is no second production server. |
| Python/uv | Run optional development checks outside the learner runtime. |

Svelte defines the interface while TypeScript checks its logic. Selection,
dragging, row filling and undo need immediate client state close to the activity.
Go independently checks settled answers and SQLite preserves their history.
Embedding the interface makes deployment one executable with separate learner data.
[Architecture](.context/architecture.md) explains ownership and save ordering.

## Code map

| Area | Responsibility |
| --- | --- |
| `cmd/math-workshop/main.go` | Loopback startup, data path and graceful shutdown |
| `internal/workshop/` | Mathematics, SQLite transactions and bounded HTTP API |
| `web/src/components/` | Activity, session and grown-up interfaces |
| `web/src/lib/` | Tile operations, acknowledged saves and uncertain submission retries |
| `content/starter.json` | Typed finite defaults; immutable legacy bodies are in `content/legacy.json` |
| `scripts/` | Build, source checks/export, packaging and notices |
| `web/tests/`, `tooling/` | Browser scenarios and executable checks |

The [context index](.context/INDEX.md) provides further project guidance.
