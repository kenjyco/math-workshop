<script lang="ts">
  import { onMount, tick } from 'svelte';
  import type { Board, FactorRules } from '../lib/types.ts';
  import {
    emptyBoard,
    tray,
    place,
    remove,
    resize,
    turn,
    fillRow,
  } from '../lib/board.ts';
  let {
    board,
    rules,
    pairCount,
    change,
    help,
    assistance,
    busy,
    discoveries,
  }: {
    board: Board;
    rules: FactorRules;
    pairCount: number;
    change: (b: Board) => void;
    help: (n: number) => Promise<boolean>;
    assistance: number;
    busy: boolean;
    discoveries: string[];
  } = $props();
  let selected = $state<number | null>(null),
    row = $state(0),
    undo = $state<Board[]>([]),
    helpOpen = $state(false),
    resizeMessage = $state('');
  let viewport: HTMLDivElement;
  let canLeft = $state(false),
    canRight = $state(false),
    canUp = $state(false),
    canDown = $state(false);
  let lastCell: { x: number; y: number } | null = null;
  const overflows = $derived(canLeft || canRight || canUp || canDown);
  const overviewUnit = $derived(
    Math.min(14, 240 / board.width, 120 / board.height),
  );
  const rowFull = $derived(
    board.tiles.filter((t) => t.y === row).length === board.width,
  );
  let dragging = $state<{
    id: number;
    pointer: number;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);
  let target = $state('');
  let suppressClick = false;
  const available = $derived(tray(board, rules));
  const found = $derived(discoveries.length);
  const complete = $derived(found === pairCount);
  const progress = $derived(
    complete
      ? pairCount === 1
        ? `You found the factor pair for ${rules.total}!`
        : `All ${pairCount} factor pairs found for ${rules.total}!`
      : found === 0
        ? pairCount === 1
          ? `There is 1 factor pair to find for ${rules.total}.`
          : `There are ${pairCount} factor pairs to find for ${rules.total}.`
        : `${found} of ${pairCount} found · ${pairCount - found} more to find.`,
  );
  function measure() {
    if (!viewport) return;
    canLeft = viewport.scrollLeft > 1;
    canRight =
      viewport.scrollLeft + viewport.clientWidth < viewport.scrollWidth - 1;
    canUp = viewport.scrollTop > 1;
    canDown =
      viewport.scrollTop + viewport.clientHeight < viewport.scrollHeight - 1;
  }
  onMount(() => {
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    observer.observe(viewport.firstElementChild!);
    measure();
    return () => observer.disconnect();
  });
  function reveal(x: number, y: number) {
    const cell = viewport.querySelector<HTMLElement>(`[data-cell="${x},${y}"]`);
    if (!cell) return;
    const box = cell.getBoundingClientRect(),
      frame = viewport.getBoundingClientRect();
    viewport.scrollBy({
      left:
        x === board.width - 1
          ? viewport.scrollWidth - viewport.clientWidth - viewport.scrollLeft
          : x === 0
            ? -viewport.scrollLeft
            : box.left < frame.left + 6
              ? box.left - frame.left - 6
              : Math.max(0, box.right - frame.right + 6),
      top:
        y === board.height - 1
          ? viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop
          : y === 0
            ? -viewport.scrollTop
            : box.top < frame.top + 6
              ? box.top - frame.top - 6
              : Math.max(0, box.bottom - frame.bottom + 6),
      behavior: 'instant',
    });
    measure();
  }
  async function reshape(next: Board, turning = false, remember = true) {
    if (next === board) return;
    resizeMessage = '';
    const selectedTile = next.tiles.find((t) => t.id === selected);
    const anchor =
      selectedTile ??
      (lastCell && (turning ? { x: lastCell.y, y: lastCell.x } : lastCell));
    if (remember) edit(next);
    else change(next);
    row = Math.min(row, next.height - 1);
    lastCell = anchor
      ? {
          x: Math.min(anchor.x, next.width - 1),
          y: Math.min(anchor.y, next.height - 1),
        }
      : null;
    await tick();
    viewport.scrollTo({ left: 0, top: 0, behavior: 'instant' });
    if (lastCell) reveal(lastCell.x, lastCell.y);
    measure();
  }
  function edit(next: Board) {
    if (next === board) return;
    resizeMessage = '';
    undo = [...undo.slice(-49), structuredClone($state.snapshot(board))];
    change(next);
    row = Math.min(row, next.height - 1);
  }
  function changeWidth(width: number) {
    const next = resize(board, width, rules);
    if (next === board) return;
    const displaced = board.tiles.length - next.tiles.length;
    void reshape(next);
    selected = null;
    resizeMessage =
      (displaced === 0
        ? 'No tiles returned to the tray.'
        : `${displaced} ${displaced === 1 ? 'tile' : 'tiles'} returned to the tray.`) +
      ' Undo restores the previous shape.';
  }
  function cell(x: number, y: number) {
    row = y;
    const tile = board.tiles.find((t) => t.x === x && t.y === y);
    if (selected !== null) {
      if (!tile) {
        edit(place(board, selected, x, y, rules));
        selected = null;
      }
    } else if (tile) {
      selected = tile.id;
    }
  }
  function pointerDown(event: PointerEvent, id: number) {
    if (event.button !== 0) return;
    dragging = {
      id,
      pointer: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }
  function pointerMove(event: PointerEvent) {
    if (!dragging || event.pointerId !== dragging.pointer) return;
    if (
      Math.hypot(
        event.clientX - dragging.startX,
        event.clientY - dragging.startY,
      ) > 6
    )
      dragging.moved = true;
    const el = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>('[data-cell]');
    target = dragging.moved && el ? el.dataset.cell || '' : '';
  }
  function cancel() {
    dragging = null;
    target = '';
  }
  function pointerUp(event: PointerEvent) {
    if (!dragging) return;
    const state = dragging;
    if (state.moved) {
      suppressClick = true;
      setTimeout(() => (suppressClick = false), 0);
      const el = document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest<HTMLElement>('[data-cell]');
      if (el) {
        const [x, y] = (el.dataset.cell || '').split(',').map(Number);
        const next = place(board, state.id, x, y, rules);
        if (next !== board) {
          edit(next);
          row = y;
          lastCell = { x, y };
          selected = null;
        }
      }
    }
    cancel();
  }
  function tap(action: () => void) {
    if (!suppressClick) action();
  }
  function keyboard(event: KeyboardEvent, x: number, y: number) {
    if (event.key === 'Escape') {
      selected = null;
      cancel();
      return;
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      const tile = board.tiles.find((t) => t.x === x && t.y === y);
      if (tile) {
        event.preventDefault();
        edit(remove(board, tile.id));
        selected = null;
      }
      return;
    }
    const moves: Record<string, [number, number]> = {
      ArrowRight: [1, 0],
      ArrowLeft: [-1, 0],
      ArrowDown: [0, 1],
      ArrowUp: [0, -1],
    };
    const step = moves[event.key];
    if (!step) return;
    event.preventDefault();
    const nx = Math.max(0, Math.min(board.width - 1, x + step[0])),
      ny = Math.max(0, Math.min(board.height - 1, y + step[1]));
    viewport
      .querySelector<HTMLButtonElement>(`[data-cell="${nx},${ny}"]`)
      ?.focus();
  }
  async function showHelp() {
    if (await help(1)) helpOpen = true;
  }
  async function worked() {
    if (!(await help(2))) return;
    let next = emptyBoard(rules, rules.exampleWidth);
    for (let y = 0; y < next.height; y++) next = fillRow(next, y, rules);
    selected = null;
    lastCell = null;
    await reshape(next);
  }
  function pan(x: number, y: number) {
    viewport.scrollBy({ left: x, top: y, behavior: 'instant' });
    measure();
  }
</script>

<svelte:window
  onkeydown={(e) => {
    if (e.key === 'Escape') {
      cancel();
      selected = null;
    }
  }}
/>
<div class="activity-heading">
  <span class="eyebrow">FACTOR WORKSHOP</span>
  <h1 class="navigation-heading" tabindex="-1">One number. Many rectangles.</h1>
  <p>Use all <strong>{rules.total} tiles</strong> to fill the whole frame.</p>
</div>
<div class="factor-layout">
  <section class="board-panel" aria-label="Rectangle workbench">
    <div class="board-toolbar">
      <label
        >Tiles per row <select
          aria-label="Tiles per row"
          aria-describedby="resize-help"
          value={board.width}
          onchange={(e) => changeWidth(Number(e.currentTarget.value))}
          >{#if board.width < rules.widths.min || board.width > rules.widths.max}<option
              value={board.width}>{board.width} (turned)</option
            >{/if}{#each Array.from({ length: rules.widths.max - rules.widths.min + 1 }, (_, i) => rules.widths.min + i) as n}<option
              value={n}>{n}</option
            >{/each}</select
        ></label
      >
      <span class="dimensions"
        >{board.width}
        {board.width === 1 ? 'column' : 'columns'} × {board.height}
        {board.height === 1 ? 'row' : 'rows'}</span
      >
      <button
        onclick={() => {
          void reshape(turn(board), true);
        }}>Turn ↻</button
      >
    </div>
    <p id="resize-help" class="small">
      Changing width reshapes this board. Tiles that no longer fit return to the
      tray. Returning to an earlier width does not restore its layout.
    </p>
    <p class="resize-feedback small" role="status">{resizeMessage}</p>
    <div
      class="board-viewport"
      bind:this={viewport}
      onscroll={measure}
      aria-label="Scrollable rectangle editor"
    >
      <div
        class="tile-board"
        style={`grid-template-columns:repeat(${board.width},48px)`}
      >
        {#each Array.from( { length: board.width * board.height }, (_, i) => ({ x: i % board.width, y: Math.floor(i / board.width) }) ) as pos (`${pos.x},${pos.y}`)}
          {@const tile = board.tiles.find(
            (t) => t.x === pos.x && t.y === pos.y,
          )}
          <button
            class="cell"
            class:occupied={!!tile}
            class:selected={selected !== null && tile?.id === selected}
            class:drop-target={target === `${pos.x},${pos.y}`}
            data-cell={`${pos.x},${pos.y}`}
            aria-label={`Row ${pos.y + 1}, column ${pos.x + 1}${tile ? `, tile ${tile.id}` : ', empty'}`}
            onclick={() => tap(() => cell(pos.x, pos.y))}
            onkeydown={(e) => keyboard(e, pos.x, pos.y)}
            onfocus={() => {
              row = pos.y;
              lastCell = pos;
              reveal(pos.x, pos.y);
            }}
            onpointerdown={(e) => {
              if (tile) pointerDown(e, tile.id);
            }}
            onpointermove={pointerMove}
            onpointerup={pointerUp}
            onpointercancel={cancel}
            onlostpointercapture={cancel}>{tile?.id ?? ''}</button
          >
        {/each}
      </div>
    </div>
    {#if overflows}
      <figure class="shape-overview">
        <figcaption>
          Whole rectangle overview · same tiles, not extra tiles
        </figcaption>
        <svg
          role="img"
          aria-label={`Overview: ${board.width} ${board.width === 1 ? 'column' : 'columns'} by ${board.height} ${board.height === 1 ? 'row' : 'rows'}, ${board.tiles.length} filled ${board.tiles.length === 1 ? 'cell' : 'cells'} and ${board.width * board.height - board.tiles.length} ${board.width * board.height - board.tiles.length === 1 ? 'gap' : 'gaps'}`}
          viewBox={`0 0 ${board.width} ${board.height}`}
          width={board.width * overviewUnit}
          height={board.height * overviewUnit}
        >
          {#each Array.from( { length: board.width * board.height }, (_, i) => ({ x: i % board.width, y: Math.floor(i / board.width) }) ) as pos}
            <rect
              x={pos.x + 0.04}
              y={pos.y + 0.04}
              width="0.92"
              height="0.92"
              class:filled={board.tiles.some(
                (t) => t.x === pos.x && t.y === pos.y,
              )}
            />
          {/each}
        </svg>
        <p class="overflow-cue">
          {canUp ? 'More rows above. ' : ''}{canDown
            ? 'More rows below. '
            : ''}{canLeft ? 'More columns to the left. ' : ''}{canRight
            ? 'More columns to the right. '
            : ''}Scroll or use Pan to see the whole rectangle.
        </p>
      </figure>
    {/if}
    <div class="pan-controls controls" aria-label="Move the board view">
      <span>Pan</span><button
        aria-label="Pan left"
        disabled={!canLeft}
        onclick={() => pan(-240, 0)}>←</button
      ><button
        aria-label="Pan right"
        disabled={!canRight}
        onclick={() => pan(240, 0)}>→</button
      ><button
        aria-label="Pan up"
        disabled={!canUp}
        onclick={() => pan(0, -240)}>↑</button
      ><button
        aria-label="Pan down"
        disabled={!canDown}
        onclick={() => pan(0, 240)}>↓</button
      >
    </div>
    <div class="controls row-tools">
      <label
        >Row to fill <select aria-label="Row to fill" bind:value={row}
          >{#each Array.from({ length: board.height }, (_, i) => i) as n}<option
              value={n}>{n + 1}</option
            >{/each}</select
        ></label
      ><button
        onclick={() => edit(fillRow(board, row, rules))}
        disabled={!available.length || rowFull}>Fill row</button
      ><button
        disabled={!undo.length}
        onclick={() => {
          const previous = undo.at(-1)!;
          undo = undo.slice(0, -1);
          void reshape(previous, false, false);
          selected = null;
          row = Math.min(row, previous.height - 1);
        }}>Undo</button
      ><button
        onclick={() => {
          lastCell = null;
          void reshape(emptyBoard(rules, board.width));
          selected = null;
        }}>Reset board</button
      >
    </div>
    {#if rowFull}<p class="row-note small">This row is full.</p>{/if}
    <p class="inventory" aria-live="polite">
      <strong>{board.tiles.length}</strong> on board <span>·</span>
      <strong>{available.length}</strong>
      in tray <span>·</span>
      {rules.total} total
    </p>
  </section>
  <aside class="factor-side">
    <section class="tray-panel">
      <div class="section-line">
        <h2>Tile tray</h2>
        <span>{available.length} left</span>
      </div>
      <p class="small">Select a tile, then an empty cell. Or drag a tile.</p>
      <div class="tile-tray">
        {#each available as id}<button
            class="tray-tile"
            class:selected={selected === id}
            aria-label={`Tray tile ${id}`}
            aria-pressed={selected === id}
            onclick={() => tap(() => (selected = selected === id ? null : id))}
            onpointerdown={(e) => pointerDown(e, id)}
            onpointermove={pointerMove}
            onpointerup={pointerUp}
            onpointercancel={cancel}
            onlostpointercapture={cancel}>{id}</button
          >{/each}
      </div>
      <p class="selection" aria-live="polite">
        {selected !== null
          ? `Tile ${selected} selected`
          : 'Choose a tile to move'}
      </p>
      <button
        disabled={selected === null ||
          !board.tiles.some((t) => t.id === selected)}
        onclick={() => {
          if (selected !== null) {
            edit(remove(board, selected));
            selected = null;
          }
        }}>Return selected tile</button
      >
    </section>
    <section class="discoveries">
      <h2>Your factor pairs</h2>
      <p role="status" aria-live="polite" aria-atomic="true">{progress}</p>
      <p class="small">
        {complete
          ? 'You can keep exploring or choose Done for now.'
          : 'Check a complete rectangle to record its pair.'}
      </p>
      <div class="pair-list">
        {#each discoveries as pair}{@const [a, b] = pair.split(' × ')}<span
            >{a} × {b} = {b} × {a}</span
          >{/each}
      </div>
      <p class="small">Turning a rectangle counts as the same pair.</p>
    </section>
  </aside>
</div>
<div class="controls">
  <button onclick={showHelp} disabled={busy}>Help</button><span class="small"
    >{assistance === 2
      ? 'Worked arrangement seen'
      : assistance === 1
        ? 'Hint seen'
        : ''}</span
  >
</div>
{#if helpOpen}<aside class="help-box">
    <h2>Look for equal rows</h2>
    <p>
      Every row must be full. A gap belongs to the frame, so try changing the
      width if {rules.total} tiles leave a space.
    </p>
    <p>
      Keyboard: Enter selects or places. Arrow keys move between cells. Delete
      returns a tile. Escape clears selection.
    </p>
    <p>
      Undo restores the previous shape and exact tile positions, up to 50 board
      edits while this activity stays open. Leaving clears Undo history; saved
      work, submitted attempts and help remain.
    </p>
    <div class="controls">
      <button disabled={busy} onclick={worked}
        >Show a {rules.exampleWidth} × {rules.total / rules.exampleWidth} arrangement</button
      ><button onclick={() => (helpOpen = false)}>Close help</button>
    </div>
    <p class="small">
      A worked arrangement records help. You still choose when to Check. Columns
      are tiles per row. New practice starts the currently configured activity.
      Your saved work keeps its own tile total.
    </p>
  </aside>{/if}
