<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import type { Session, Draft, Result, Rules } from '../lib/types.ts';
  import { api } from '../lib/api.ts';
  import { Checkpoints } from '../lib/checkpoint.ts';
  import type { SaveState } from '../lib/checkpoint.ts';
  import { activityDescription } from '../lib/activity.ts';
  import CountCombine from './CountCombine.svelte';
  import FactorWorkshop from './FactorWorkshop.svelte';
  import type { Submissions } from '../lib/submissions.ts';
  let {
    session,
    nextRules,
    next,
    recover,
    checks,
    done,
    leaving,
  }: {
    session: Session;
    nextRules: Rules;
    next: () => void;
    recover: () => void;
    checks: Submissions;
    done: () => void;
    leaving: boolean;
  } = $props();
  // The parent keys this component by session; each queue owns one fixed view.
  const initial = untrack(() => session);
  let draft: Draft = $state(structuredClone($state.snapshot(initial.draft)));
  let assistance = $state(initial.assistance);
  let discoveries = $state([...initial.discoveries]);
  let saveState: SaveState = $state('Saved');
  let result: Result | null = $state(null),
    error = $state(''),
    checking = $state(false),
    helping = $state(false);
  let editVersion = 0,
    closed = false;
  const submissions = untrack(() => checks);
  let uncertain = $state(false);
  const unwatch = submissions.watch((response) => {
    checking = submissions.busy;
    uncertain = submissions.uncertain;
    if (response?.pair && !discoveries.includes(response.pair))
      discoveries = [...discoveries, response.pair];
  });
  const base = `/learners/${initial.learnerId}/sessions/${initial.id}`;
  const queue = new Checkpoints(
    initial.version,
    initial.id,
    (expectedVersion, draft) =>
      api(base + '/draft', 'PUT', { expectedVersion, draft }),
    (state) => (saveState = state),
  );
  export async function flush() {
    let timeout: ReturnType<typeof setTimeout>;
    try {
      return await Promise.race([
        queue.flush(),
        new Promise<boolean>((resolve) => {
          timeout = setTimeout(() => resolve(false), 4000);
        }),
      ]);
    } finally {
      clearTimeout(timeout!);
    }
  }
  function edit(value: Draft) {
    draft = value;
    editVersion++;
    result = null;
    error = '';
    queue.edit($state.snapshot(value));
  }
  async function help(level: number) {
    helping = true;
    error = '';
    try {
      const response = await api<{ assistance: number }>(
        base + '/assist',
        'POST',
        { level },
      );
      if (closed) return false;
      assistance = response.assistance;
      return true;
    } catch {
      if (!closed)
        error = 'Help could not be recorded. Retry when storage is available.';
      return false;
    } finally {
      if (!closed) helping = false;
    }
  }
  async function check() {
    const version = editVersion;
    const snapshot = structuredClone($state.snapshot(draft));
    error = '';
    try {
      const { result: response, submission } = await submissions.run(
        snapshot,
        version,
      );
      if (closed) return;
      if (
        version === editVersion &&
        JSON.stringify(submission.draft) ===
          JSON.stringify($state.snapshot(draft))
      )
        result = response;
    } catch {
      if (!closed)
        error = submissions.pending
          ? 'Could not confirm this submission. Check again to retry the same answer safely.'
          : 'This browser could not keep a safe retry record. Check has not been sent.';
    } finally {
      if (!closed) checking = false;
    }
  }
  function beforeUnload(event: BeforeUnloadEvent) {
    if (saveState !== 'Saved' || submissions.pending || helping) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
  function downloadDraft() {
    const blob = new Blob(
      [
        JSON.stringify(
          { sessionId: session.id, draft: $state.snapshot(draft) },
          null,
          2,
        ),
      ],
      { type: 'application/json' },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'unsaved-work.json';
    a.click();
    URL.revokeObjectURL(url);
  }
  onDestroy(() => {
    closed = true;
    unwatch();
    queue.close();
  });
</script>

<svelte:window onbeforeunload={beforeUnload} />
<div class="activity-navigation">
  <button disabled={leaving || helping} onclick={done}>Done for now</button>
</div>
<div class="save-line">
  <span
    class:save-problem={saveState === 'Save failed' || saveState === 'Conflict'}
    role="status">{saveState}</span
  ><span class="small">{activityDescription(session.rules)} · untimed</span>
</div>
{#if saveState === 'Conflict'}<aside class="error-box">
    <h2>Another tab saved this exercise</h2>
    <p>
      Your local work is still here. Save a copy if needed, then load the
      acknowledged work. Recorded attempts and help stay with this learner.
    </p>
    <div class="controls">
      <button onclick={downloadDraft}>Keep local copy</button><button
        onclick={recover}>Load saved work</button
      >
    </div>
  </aside>{/if}
{#if saveState === 'Save failed'}<aside class="error-box">
    Latest changes are not confirmed saved. Keep this page open. <button
      onclick={() => queue.flush()}>Retry save</button
    >
  </aside>{/if}
{#if session.activity === 'count' && draft.count}<CountCombine
    a={session.parameters.a}
    b={session.parameters.b}
    answers={session.rules.answers!}
    draft={draft.count}
    change={(count) => edit({ count })}
    {help}
    {assistance}
    busy={checking || uncertain || helping}
  />{/if}
{#if session.activity === 'factor' && draft.factor}<FactorWorkshop
    board={draft.factor}
    rules={session.rules.factor!}
    pairCount={session.rules.pairCount!}
    change={(factor) => edit({ factor })}
    {help}
    {assistance}
    {discoveries}
    busy={checking || uncertain || helping}
  />{/if}
<div class="answer-bar" class:count-answer={session.activity === 'count'}>
  <button
    class="primary check-button"
    disabled={checking ||
      helping ||
      leaving ||
      (!uncertain &&
        (saveState === 'Conflict' ||
          (session.activity === 'count' && draft.count?.answer === null)))}
    onclick={check}>{checking ? 'Checking…' : 'Check'}</button
  >
  {#if session.activity === 'factor'}<button
      disabled={leaving || checking || uncertain || helping}
      onclick={next}>New practice ({nextRules.factor!.total} tiles)</button
    >{:else if result?.outcome === 'correct'}<button
      class="primary"
      disabled={leaving || checking || uncertain || helping}
      onclick={next}>Next →</button
    >{/if}
</div>
<div
  class="feedback"
  class:correct={result?.outcome === 'correct'}
  role="status"
  aria-live="polite"
>
  {result?.feedback ?? ''}
</div>
{#if uncertain}<p class="error-box" role="alert">
    Could not confirm the earlier submission. Check again to retry that same
    answer safely, even if you have edited since. Help is available after it is
    confirmed.
  </p>
{:else if error}<p class="error-box" role="alert">{error}</p>{/if}
