<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { api } from './lib/api.ts';
  import type { Learner, Session } from './lib/types.ts';
  import { activityDescription } from './lib/activity.ts';
  import SessionView from './components/SessionView.svelte';
  import ParentInfo from './components/ParentInfo.svelte';
  import { Submissions } from './lib/submissions.ts';
  let learners: Learner[] = $state([]),
    session: Session | null = $state(null),
    page = $state<'home' | 'activity' | 'parent'>('home'),
    error = $state(''),
    busy = $state(false);
  let view: SessionView | undefined = $state();
  let generation = 0;
  let navigation = 0;
  const checks = new Map<string, Submissions>();
  let departure = $state<(() => Promise<void>) | null>(null);
  let returnFocus: HTMLElement | null = null;
  let main: HTMLElement;
  function checksFor(value: Session) {
    let existing = checks.get(value.id);
    if (!existing) {
      existing = new Submissions(
        value.id,
        (submitted) =>
          api(
            `/learners/${value.learnerId}/sessions/${value.id}/attempts`,
            'POST',
            submitted,
          ),
        sessionStorage,
      );
      checks.set(value.id, existing);
    }
    return existing;
  }
  onMount(() => {
    api<Learner[]>('/learners')
      .then((value) => (learners = value))
      .catch(
        () =>
          (error =
            'The workshop could not load. Check that the local server is running.'),
      );
  });
  async function leave(action: () => Promise<void>, discard = false) {
    if (busy) return;
    const ticket = ++navigation;
    const origin = document.activeElement;
    let focusMoved = false;
    const trackFocus = (event: FocusEvent) => {
      if (event.target !== origin) focusMoved = true;
    };
    document.addEventListener('focusin', trackFocus);
    if (!departure)
      returnFocus =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
    busy = true;
    try {
      if (!discard && view && !(await view.flush())) {
        departure = action;
        await tick();
        return;
      }
      departure = null;
      await action();
      await tick();
      if (!focusMoved && ticket === navigation)
        main.querySelector<HTMLElement>('.navigation-heading')?.focus();
    } finally {
      busy = false;
      await tick();
      if (departure && !focusMoved && ticket === navigation)
        document.getElementById('stay-here')?.focus();
      document.removeEventListener('focusin', trackFocus);
    }
  }
  async function open(learner: string, fresh = false) {
    await leave(() => load(learner, fresh));
  }
  async function load(learner: string, fresh: boolean) {
    const ticket = ++generation;
    error = '';
    try {
      const value = await api<Session>(
        `/learners/${learner}/sessions`,
        'POST',
        { new: fresh },
      );
      if (ticket === generation) {
        checksFor(value);
        session = value;
        page = 'activity';
      }
    } catch {
      error =
        'This exercise could not be loaded. Your saved work is still kept.';
    }
  }
  async function navigate(destination: 'home' | 'parent') {
    await leave(async () => {
      generation++;
      session = null;
      page = destination;
      error = '';
    });
  }
  async function recover() {
    if (!session || busy) return;
    navigation++;
    busy = true;
    try {
      const value = await api<Session>(
        `/learners/${session.learnerId}/sessions/${session.id}`,
      );
      session = null;
      await tick();
      session = value;
      error = '';
    } catch {
      error = 'Saved work could not be loaded. Your local work is still here.';
    } finally {
      busy = false;
    }
  }
</script>

<header>
  <a
    class="brand"
    href="#main"
    onclick={(e) => {
      e.preventDefault();
      void navigate('home');
    }}
    aria-label="Math Workshop home"
    ><span class="brand-mark" aria-hidden="true">▦</span><span
      >Math<br /><strong>Workshop</strong></span
    ></a
  >
  <nav aria-label="Main">
    <button disabled={busy} onclick={() => navigate('home')}
      >{page === 'activity' ? 'Switch learner' : 'Home'}</button
    ><button disabled={busy} onclick={() => navigate('parent')}
      >For grown-ups</button
    >
  </nav>
</header>
<main id="main" bind:this={main}>
  {#if error}<p class="error-box" role="alert">{error}</p>{/if}
  {#if busy}<p role="status">Please wait for your work…</p>{/if}
  {#if departure}
    <aside
      class="error-box"
      role="region"
      aria-label="Leave without latest edits?"
    >
      <h2>Your latest edits are not confirmed saved</h2>
      <p>
        Stay to retry or recover saved work. Leaving keeps acknowledged work,
        attempts and help, but may lose your latest edits. An uncertain Check
        keeps its retry identity.
      </p>
      <div class="controls">
        <button
          id="stay-here"
          disabled={busy}
          onclick={() => {
            departure = null;
            returnFocus?.focus();
          }}>Stay here</button
        >
        <button disabled={busy} onclick={() => departure && leave(departure)}
          >Retry save and leave</button
        >
        <button
          disabled={busy}
          onclick={() => departure && leave(departure, true)}
          >Leave without latest edits</button
        >
      </div>
    </aside>
  {/if}
  {#if page === 'home'}
    <section class="welcome">
      <span class="eyebrow">MAKE SPACE FOR MATH</span>
      <h1 class="navigation-heading" tabindex="-1">Let’s work it out.</h1>
      <p>Things to count. Shapes to make.<br />A place to try an idea.</p>
    </section>
    <div class="learner-grid">
      {#each learners as learner}<button
          class={`learner-card ${learner.activity}`}
          disabled={busy}
          onclick={() => open(learner.id)}
          ><span class={`avatar ${learner.activity}`} aria-hidden="true"
          ></span><span class="learner-name">{learner.name}</span><strong
            >{learner.activity === 'count'
              ? 'Count & combine'
              : 'Factor workshop'}</strong
          ><span class="card-description"
            >{activityDescription(learner.rules)}</span
          ><span class="card-action"
            >Open workshop <span aria-hidden="true">↗</span></span
          ></button
        >{/each}
    </div>
    <p class="home-note">
      Take your time. Try things. Help is always close by.
    </p>
  {:else if page === 'parent'}<ParentInfo {learners} />
  {:else if session}{#key session.id}<SessionView
        bind:this={view}
        {session}
        nextRules={learners.find(
          (learner) => learner.id === session!.learnerId,
        )!.rules}
        checks={checksFor(session)}
        done={() => navigate('home')}
        leaving={busy}
        next={() => open(session!.learnerId, true)}
        {recover}
      />{/key}{/if}
</main>
<footer>
  <span>Math Workshop</span><span>Small discoveries, made by you.</span>
</footer>
