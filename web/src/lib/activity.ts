import type { Rules } from './types.ts';
export function activityDescription(rules: Rules): string {
  if (rules.count) {
    const { a, b } = rules.count;
    const answers = rules.answers!;
    if (answers.max < a.max + b.max)
      return `Count & combine · totals through ${answers.max}`;
    return `Count & combine · ${a.min}–${a.max} + ${b.min}–${b.max}`;
  }
  return `Factor workshop · ${rules.factor!.total} unit tiles`;
}
