import { APIError } from './api.ts';
import type { Draft } from './types.ts';
export type SaveState =
  'Saved' | 'Unsaved' | 'Saving…' | 'Save failed' | 'Conflict';
type Acknowledgement = { version: number; sessionId: string };
// One queue belongs to exactly one mounted session. Acknowledging an older
// snapshot never marks newer edits Saved. Submissions use their own frozen copy.
export class Checkpoints {
  version: number;
  state: SaveState = 'Saved';
  private pending: Draft | null = null;
  private flight: Promise<void> | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private closed = false;
  private sessionId: string;
  private send: (version: number, draft: Draft) => Promise<Acknowledgement>;
  private changed: (state: SaveState) => void;
  constructor(
    version: number,
    sessionId: string,
    send: (version: number, draft: Draft) => Promise<Acknowledgement>,
    changed: (state: SaveState) => void,
  ) {
    this.version = version;
    this.sessionId = sessionId;
    this.send = send;
    this.changed = changed;
  }
  private set(state: SaveState) {
    this.state = state;
    if (!this.closed) this.changed(state);
  }
  edit(draft: Draft) {
    this.pending = structuredClone(draft);
    if (this.state === 'Conflict') return;
    this.set('Unsaved');
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush(), 220);
  }
  async flush(): Promise<boolean> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.flight) {
      await this.flight;
      return this.state === 'Unsaved' ? this.flush() : this.state === 'Saved';
    }
    if (this.state === 'Conflict' || this.closed) return false;
    if (!this.pending) return this.state === 'Saved';
    const snapshot = this.pending;
    this.pending = null;
    this.set('Saving…');
    this.flight = (async () => {
      try {
        const result = await this.send(this.version, snapshot);
        if (result.sessionId !== this.sessionId)
          throw new Error('Wrong session acknowledgement');
        this.version = result.version;
        this.set(this.pending ? 'Unsaved' : 'Saved');
      } catch (error) {
        if (!this.pending) this.pending = snapshot;
        this.set(
          error instanceof APIError && error.status === 409
            ? 'Conflict'
            : 'Save failed',
        );
      }
    })();
    await this.flight;
    this.flight = null;
    if (this.state === 'Unsaved') return this.flush();
    return this.state === 'Saved';
  }
  close() {
    this.closed = true;
    if (this.timer) clearTimeout(this.timer);
  }
}
