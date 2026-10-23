import type { Draft, Result } from './types.ts';

export type Submission = {
  submissionId: string;
  clientVersion: number;
  draft: Draft;
};
type Receipt = { result: Result; submission: Submission };
type Journal = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

// Owned by App, not a mounted activity. Leaving never cancels an uncertain Check.
// The tab journal also keeps its exact retry identity across ordinary reloads.
export class Submissions {
  pending: Submission | null = null;
  busy = false;
  uncertain = false;
  private flight: Promise<Receipt> | null = null;
  private listeners = new Set<(result?: Result) => void>();
  private key: string;
  private sessionId: string;
  private send: (submission: Submission) => Promise<Result>;
  private journal: Journal;

  constructor(
    sessionId: string,
    send: (submission: Submission) => Promise<Result>,
    journal: Journal,
  ) {
    this.sessionId = sessionId;
    this.send = send;
    this.journal = journal;
    this.key = 'workshop-check:' + sessionId;
    const stored = journal.getItem(this.key);
    if (stored) {
      this.pending = JSON.parse(stored);
      this.uncertain = true;
    }
  }
  watch(listener: (result?: Result) => void) {
    this.listeners.add(listener);
    listener();
    return () => {
      this.listeners.delete(listener);
    };
  }
  private notify(result?: Result) {
    for (const listener of this.listeners) listener(result);
  }
  run(draft: Draft, clientVersion: number): Promise<Receipt> {
    if (this.flight) return this.flight;
    const submission = this.pending ?? {
      submissionId: crypto.randomUUID(),
      clientVersion,
      draft: structuredClone(draft),
    };
    // If browser storage is unavailable, fail before sending a new request.
    this.journal.setItem(this.key, JSON.stringify(submission));
    this.pending = submission;
    this.busy = true;
    this.uncertain = false;
    this.notify();
    this.flight = this.send(submission)
      .then((result) => {
        if (
          result.sessionId !== this.sessionId ||
          result.submissionId !== submission.submissionId ||
          result.clientVersion !== submission.clientVersion
        )
          throw new Error('Unmatched submission response');
        this.journal.removeItem(this.key);
        this.pending = null;
        this.notify(result);
        return { result, submission };
      })
      .catch((error) => {
        this.uncertain = true;
        throw error;
      })
      .finally(() => {
        this.busy = false;
        this.flight = null;
        this.notify();
      });
    return this.flight;
  }
}
