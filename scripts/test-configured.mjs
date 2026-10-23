// Build an alternate embedded definition in a disposable clean source export.
// No runtime configuration endpoint or owner database is involved.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { externalPath } from './external-output.mjs';
const output = externalPath(process.argv[2]);
const root = path.resolve(import.meta.dirname, '..');
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'workshop-configured-'));
const run = (command, args, cwd, env = process.env) =>
  execFileSync(command, args, { cwd, env, stdio: 'inherit' });
try {
  const source = path.join(scratch, 'source');
  run(process.execPath, ['scripts/source.mjs', source], root);
  const file = path.join(source, 'content/starter.json');
  const definition = JSON.parse(fs.readFileSync(file, 'utf8'));
  definition.count.id = 'count-small-fixture';
  definition.count.rules = { a: { min: 0, max: 2 }, b: { min: 0, max: 3 } };
  definition.count.opening = [
    [2, 1],
    [0, 0],
    [2, 3],
  ];
  for (const total of [12, 16, 7]) {
    const width = total === 7 ? 7 : 4;
    definition.factor.id = `factor-${total}-fixture`;
    definition.factor.rules = {
      total,
      widths: { min: 1, max: total },
      startWidth: width,
      exampleWidth: width,
    };
    fs.writeFileSync(file, JSON.stringify(definition, null, 2) + '\n');
    if (total === 12) run('npm', ['ci'], path.join(source, 'web'));
    run('npm', ['run', 'build'], path.join(source, 'web'));
    const binary = path.join(scratch, 'math-workshop-configured');
    run('go', ['build', '-o', binary, './cmd/math-workshop'], source);
    run(
      'npm',
      [
        'run',
        'test:browser',
        '--',
        total === 12 ? 'parameterized.spec.ts' : 'factor-progress.spec.ts',
      ],
      path.join(source, 'web'),
      {
        ...process.env,
        WORKSHOP_BINARY: binary,
        WORKSHOP_FACTOR_FIXTURE: String(total),
        WORKSHOP_TEST_OUTPUT: path.join(output, String(total), 'results'),
        SCREENSHOT_DIR: path.join(output, String(total), 'screenshots'),
      },
    );
  }
} finally {
  fs.rmSync(scratch, { recursive: true, force: true });
}
