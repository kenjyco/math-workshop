export type Bounds = { min: number; max: number };
export type CountRules = { a: Bounds; b: Bounds };
export type FactorRules = {
  total: number;
  widths: Bounds;
  startWidth: number;
  exampleWidth: number;
};
export type Rules = {
  count?: CountRules;
  factor?: FactorRules;
  answers?: Bounds;
  pairCount?: number;
};
export type Learner = {
  id: string;
  name: string;
  activity: 'count' | 'factor';
  settings: { lessonId: string; revision: number };
  rules: Rules;
};
export type Tile = { id: number; x: number; y: number };
export type Board = { width: number; height: number; tiles: Tile[] };
export type CountDraft = {
  answer: number | null;
  marked: number[];
  together: boolean;
};
export type Draft = { count?: CountDraft; factor?: Board };
export type Session = {
  id: string;
  learnerId: string;
  activity: 'count' | 'factor';
  lessonId: string;
  lessonRevision: number;
  parameters: { a: number; b: number; total: number; rules?: Rules };
  rules: Rules;
  draft: Draft;
  version: number;
  assistance: number;
  validator: string;
  application: string;
  discoveries: string[];
};
export type Result = {
  sessionId: string;
  submissionId: string;
  clientVersion: number;
  outcome: 'correct' | 'retry' | 'unfinished';
  feedback: string;
  pair: string;
  assistance: number;
  feedbackVersion?: string;
};
export type Attempt = {
  learner: string;
  activity: string;
  createdAt: string;
  result: Result;
  parameters: Session['parameters'] | null;
  submission: Draft | null;
};
