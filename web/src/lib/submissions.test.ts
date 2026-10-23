import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Submissions, type Submission } from './submissions.ts';
import type { Draft, Result } from './types.ts';
const draft = (answer: number): Draft => ({
  count: { answer, marked: [], together: false },
});
const receipt = (s: Submission): Result => ({
  sessionId: 'one',
  submissionId: s.submissionId,
  clientVersion: s.clientVersion,
  outcome: 'correct',
  feedback: 'recorded',
  pair: '',
  assistance: 0,
});
function journal() {
  const values = new Map<string, string>();
  return {
    getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => {
      values.set(k, v);
    },
    removeItem: (k: string) => {
      values.delete(k);
    },
  };
}
test('uncertain Check retains frozen identity through edits, leaving and reload; later Check is new', async () => {
  const storage = journal();
  let original!: Submission;
  const first = new Submissions(
    'one',
    async (s) => {
      original = structuredClone(s);
      throw Error('lost reply');
    },
    storage,
  );
  await assert.rejects(first.run(draft(3), 5));
  assert.equal(first.uncertain, true);
  const reopened = new Submissions(
    'one',
    async (s) => {
      assert.deepEqual(s, original);
      return receipt(s);
    },
    storage,
  );
  const replay = await reopened.run(draft(2), 0);
  assert.equal(replay.submission.draft.count?.answer, 3);
  assert.equal(reopened.pending, null);
  const later = new Submissions(
    'one',
    async (s) => {
      assert.notEqual(s.submissionId, original.submissionId);
      return receipt(s);
    },
    storage,
  );
  await later.run(draft(3), 0);
});
test('in-flight Check is shared and detaching a view leaves the request intact', async () => {
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let calls = 0,
    updates = 0;
  const checks = new Submissions(
    'one',
    async (s) => {
      calls++;
      await held;
      return receipt(s);
    },
    journal(),
  );
  const unwatch = checks.watch(() => updates++);
  const first = checks.run(draft(3), 1);
  unwatch();
  const previous = updates;
  assert.equal(checks.run(draft(2), 2), first);
  release();
  await first;
  assert.equal(calls, 1);
  assert.equal(updates, previous);
  assert.equal(checks.pending, null);
});
test('wrong-session acknowledgement preserves the retry; unavailable journal prevents sending', async () => {
  const checks = new Submissions(
    'one',
    async (s) => ({ ...receipt(s), sessionId: 'another' }),
    journal(),
  );
  await assert.rejects(checks.run(draft(3), 0), /Unmatched/);
  assert.ok(checks.pending);
  let sent = false;
  const blocked = new Submissions(
    'one',
    async (s) => {
      sent = true;
      return receipt(s);
    },
    {
      ...journal(),
      setItem: () => {
        throw Error('storage unavailable');
      },
    },
  );
  assert.throws(() => blocked.run(draft(3), 0));
  assert.equal(sent, false);
});
