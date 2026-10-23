import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Checkpoints } from './checkpoint.ts';
import { APIError } from './api.ts';
import type { Draft } from './types.ts';
const draft = (n: number): Draft => ({
  count: { answer: n, marked: [], together: false },
});
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
};
test('one in flight; old acknowledgement cannot mark new edits saved', async () => {
  const first = deferred<{ version: number; sessionId: string }>();
  const second = deferred<{ version: number; sessionId: string }>();
  let calls = 0;
  const q = new Checkpoints(
    0,
    'one',
    async (v, d) => {
      calls++;
      if (calls === 1) {
        assert.equal(v, 0);
        assert.equal(d.count?.answer, 1);
        return first.promise;
      }
      assert.equal(v, 1);
      assert.equal(d.count?.answer, 2);
      return second.promise;
    },
    () => {},
  );
  q.edit(draft(1));
  const flush = q.flush();
  q.edit(draft(2));
  assert.equal(calls, 1);
  first.resolve({ version: 1, sessionId: 'one' });
  await new Promise((r) => setImmediate(r));
  assert.equal(calls, 2);
  assert.notEqual(q.state, 'Saved');
  second.resolve({ version: 2, sessionId: 'one' });
  assert.equal(await flush, true);
  assert.equal(q.version, 2);
  q.close();
});
test('failure retries exact latest snapshot; conflict never overwrites; closed view ignores late acknowledgement', async () => {
  let calls = 0;
  const states: string[] = [];
  const q = new Checkpoints(
    0,
    'one',
    async () => {
      if (++calls === 1) throw new Error('offline');
      return { version: 1, sessionId: 'one' };
    },
    (s) => states.push(s),
  );
  q.edit(draft(3));
  assert.equal(await q.flush(), false);
  assert.equal(q.state, 'Save failed');
  assert.equal(await q.flush(), true);
  q.close();
  const c = new Checkpoints(
    0,
    'two',
    async () => {
      throw new APIError(409, 'stale');
    },
    () => {},
  );
  c.edit(draft(1));
  await c.flush();
  assert.equal(c.state, 'Conflict');
  assert.equal(await c.flush(), false);
  c.close();
  const hold = deferred<{ version: number; sessionId: string }>();
  let updates = 0;
  const late = new Checkpoints(
    0,
    'old',
    () => hold.promise,
    () => updates++,
  );
  late.edit(draft(2));
  const f = late.flush();
  late.close();
  const before = updates;
  hold.resolve({ version: 1, sessionId: 'old' });
  await f;
  assert.equal(updates, before);
});
