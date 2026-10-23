<script lang="ts">
  import type { CountDraft, Bounds } from '../lib/types.ts';
  let {
    a,
    answers,
    b,
    draft,
    change,
    help,
    assistance,
    busy,
  }: {
    a: number;
    answers: Bounds;
    b: number;
    draft: CountDraft;
    change: (d: CountDraft) => void;
    help: (level: number) => Promise<boolean>;
    assistance: number;
    busy: boolean;
  } = $props();
  let helpOpen = $state(false);
  const counters = $derived(
    Array.from({ length: a + b }, (_, i) => ({
      id: i + 1,
      group: i < a ? 0 : 1,
    })),
  );
  function mark(id: number) {
    change({
      ...draft,
      marked: draft.marked.includes(id)
        ? draft.marked.filter((x) => x !== id)
        : [...draft.marked, id],
    });
  }
  async function showHelp() {
    if (await help(a + b === 0 ? 2 : 1)) helpOpen = true;
  }
  function countOne() {
    const next = counters.find((c) => !draft.marked.includes(c.id));
    if (next) change({ ...draft, marked: [...draft.marked, next.id] });
  }
</script>

<div class="count-stage">
  <div class="activity-heading">
    <span class="eyebrow">COUNT & COMBINE</span>
    <h1 class="navigation-heading" tabindex="-1">How many?</h1>
  </div>
  <div
    class="counter-field"
    class:together={draft.together}
    aria-label={draft.together
      ? 'Counters together'
      : 'Two separate counter groups'}
  >
    {#each [0, 1] as group}
      <div
        class="counter-group"
        aria-label={`Group ${group + 1}: ${group === 0 ? a : b} counters`}
      >
        {#if (group === 0 ? a : b) === 0}<span class="empty-group"
            >0 <small>empty</small></span
          >{/if}
        {#each counters.filter((c) => c.group === group) as counter (counter.id)}
          <button
            class="counter"
            class:counted={draft.marked.includes(counter.id)}
            aria-label={`Counter ${counter.id}, group ${group + 1}`}
            aria-pressed={draft.marked.includes(counter.id)}
            onclick={() => mark(counter.id)}
            ><span>{draft.marked.includes(counter.id) ? '✓' : ''}</span></button
          >
        {/each}
      </div>
    {/each}
  </div>
  <div class="center controls">
    <button onclick={() => change({ ...draft, together: !draft.together })}
      >{draft.together ? 'Apart' : 'Together'}</button
    ><button disabled={busy} onclick={showHelp}>Help</button>
  </div>
  <div class="number-pad" aria-label="Choose how many altogether">
    {#each Array.from({ length: answers.max - answers.min + 1 }, (_, i) => answers.min + i) as n}<button
        class:chosen={draft.answer === n}
        aria-label={`Answer ${n}`}
        aria-pressed={draft.answer === n}
        onclick={() => change({ ...draft, answer: n })}>{n}</button
      >{/each}
  </div>
  {#if helpOpen}
    <aside class="help-box">
      <h2>{a + b === 0 ? 'Both groups are empty' : 'One touch, one count'}</h2>
      {#if a + b === 0}
        <p>No counters here. Zero means none. Choose 0.</p>
      {:else}
        <p>
          {a === 0 || b === 0
            ? 'One group is empty. Tap each counter in the other group once.'
            : 'Tap each counter once.'} Fingers work too.
        </p>
        <p aria-live="polite">{draft.marked.length} counted.</p>
      {/if}
      <div class="controls">
        {#if a + b > 0}
          <button onclick={countOne} disabled={draft.marked.length === a + b}
            >Count one</button
          ><button onclick={() => change({ ...draft, marked: [] })}
            >Recount</button
          >{/if}<button onclick={() => (helpOpen = false)}>Close help</button>
      </div>
    </aside>
  {/if}
  <span class="assist-note"
    >{assistance > 0 ? 'Help used in this exercise' : ''}</span
  >
</div>
