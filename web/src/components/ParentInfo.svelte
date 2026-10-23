<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '../lib/api.ts';
  import { activityDescription } from '../lib/activity.ts';
  import type { Attempt, Learner } from '../lib/types.ts';
  let { learners }: { learners: Learner[] } = $props();
  let history: Attempt[] = $state([]),
    error = $state('');
  let info = $state({ application: '', storage: '' });
  onMount(() => {
    Promise.all([api<Attempt[]>('/history'), api<typeof info>('/info')])
      .then(([h, i]) => {
        history = h;
        info = i;
      })
      .catch(() => (error = 'Recent attempts could not be loaded.'));
  });
</script>

<section class="parent-panel">
  <span class="eyebrow">FOR THE GROWN-UPS</span>
  <h1 class="navigation-heading" tabindex="-1">A little about this workshop</h1>
  <p>
    Two demonstration learners, separate saved work. Choosing a profile is local
    organization, not a login.
  </p>
  <div class="settings-grid">
    {#each learners as learner}
      <div>
        <h2>{learner.name}</h2>
        <p>{activityDescription(learner.rules)}.</p>
        {#if learner.rules.count}<p>
            A finite cycle includes every ordered pair. Answers range from {learner
              .rules.answers!.min} to {learner.rules.answers!.max} on every exercise.
          </p>
        {:else}<p>
            {learner.rules.pairCount} unordered factor pairs. Turns share a pair.
          </p>{/if}
      </div>
    {/each}
    <p>
      These settings apply to new practice. Resumed work keeps its original
      rules and earlier attempts.
    </p>
  </div>
  <h2>Saved on this computer</h2>
  <p>
    {info.storage}. Reload restores the latest acknowledged draft. “Unsaved”,
    “Saving…” and errors mean the latest change is not yet confirmed.
  </p>
  <p>
    Data can be placed elsewhere with <code>--data-dir</code>. For backup, stop
    the app first and follow the packaged instructions. Profiles are not
    protection from someone using this computer.
  </p>
  <p class="small">{info.application}</p>
  <h2>Recent submitted attempts</h2>
  <p>
    Saved work and submitted answers are separate. Only Check adds an attempt;
    Done for now does not submit an answer. Your saved draft may be newer than
    its last Check.
  </p>
  <p>
    Checking unfinished work records a neutral attempt. Each entry keeps its
    original answer, time and help status; later Help does not change earlier
    entries. A later Check can record that help. These observations are not
    mastery scores.
  </p>
  {#if error}<p role="alert">{error}</p>{/if}
  {#if !history.length}<p>No submissions yet.</p>{/if}
  <ol class="history">
    {#each history as item}<li>
        <strong
          >{item.learner} · {item.result.outcome === 'retry'
            ? 'try again'
            : item.result.outcome}</strong
        >
        {#if item.activity === 'count'}
          <span class="attempt-context"
            >{item.parameters
              ? `${item.parameters.a} + ${item.parameters.b} = ?`
              : 'Original problem unavailable'} · Chose {item.submission?.count
              ?.answer ?? 'unavailable'}</span
          >
        {:else if item.activity === 'factor'}
          {@const board = item.submission?.factor}
          <span class="attempt-context"
            >{board
              ? `${board.width} ${board.width === 1 ? 'column' : 'columns'} × ${board.height} ${board.height === 1 ? 'row' : 'rows'} · ${board.tiles.length} placed · ${board.width * board.height - board.tiles.length} gaps`
              : 'Submitted rectangle unavailable'}{board && item.parameters
              ? ` · ${item.parameters.total - board.tiles.length} in tray`
              : ' · Tray count unavailable'}</span
          >
        {/if}
        <span>{item.result.feedback}</span><small
          >{item.result.assistance ? 'Help used' : 'No help disclosed'} · {new Date(
            item.createdAt,
          ).toLocaleString()}</small
        >
      </li>{/each}
  </ol>
  <h2>Next, with adult review</h2>
  <p>
    Learner settings, more numbers and classroom-informed lessons are future
    work. This preview stays on this computer. Tablet layouts do not provide
    iPad network access or offline synchronization.
  </p>
  <p class="small">
    Original geometric artwork and lesson examples. No remote fonts, analytics,
    audio or runtime AI. Source guidance: README.md, DESIGN.md and
    goals/README.md in the application repository.
  </p>
</section>
