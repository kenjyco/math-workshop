import { test as base, expect, type Page } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtemp, rm, mkdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { externalPath } from '../../scripts/external-output.mjs';
const binary = path.resolve(
  process.env.WORKSHOP_BINARY || '../.output/math-workshop',
);
async function launch(data: string, executable = binary) {
  const child = spawn(executable, ['--data-dir', data, '--port', '0'], {
    cwd: tmpdir(),
  });
  let output = '';
  const url = await new Promise<string>((resolve, reject) => {
    child.stdout.on('data', (b) => {
      output += b;
      const match = output.match(/URL (http:\/\/127\.0\.0\.1:\d+)/);
      if (match) resolve(match[1]);
    });
    child.stderr.on('data', (b) => (output += b));
    child.on('error', reject);
    child.on('exit', (code) =>
      reject(new Error(`server exited ${code}: ${output}`)),
    );
  });
  return { child, url };
}
async function stop(child: ChildProcess) {
  if (child.exitCode !== null) return;
  await new Promise<void>((resolve, reject) => {
    child.once('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`server exit ${code}`)),
    );
    child.kill('SIGTERM');
  });
}
export const test = base.extend<{
  server: { url: string; data: string; restart: () => Promise<string> };
  workshopReady: void;
  legacy: boolean;
}>({
  legacy: [false, { option: true }],
  server: async ({ legacy }, use) => {
    const data = await mkdtemp(path.join(tmpdir(), 'workshop-browser-'));
    if (legacy) {
      const previous = process.env.WORKSHOP_PREVIOUS_BINARY;
      if (!previous)
        throw new Error(
          'Legacy browser check requires WORKSHOP_PREVIOUS_BINARY',
        );
      const prior = await launch(data, previous);
      try {
        const request = async (
          route: string,
          method: string,
          body: unknown,
        ) => {
          const response = await fetch(prior.url + '/api' + route, {
            method,
            headers: {
              'Content-Type': 'application/json',
              'X-Workshop-Request': '1',
            },
            body: JSON.stringify(body),
          });
          if (!response.ok) throw new Error(await response.text());
          return response.json();
        };
        const session = await request('/learners/sprout/sessions', 'POST', {
          new: false,
        });
        const base = '/learners/sprout/sessions/' + session.id;
        const draft = { count: { answer: 3, marked: [1, 3], together: true } };
        await request(base + '/draft', 'PUT', { expectedVersion: 0, draft });
        await request(base + '/attempts', 'POST', {
          submissionId: 'prior-browser-check',
          clientVersion: 0,
          draft,
        });
        await request(base + '/assist', 'POST', { level: 1 });
      } finally {
        await stop(prior.child);
      }
    }
    let running = await launch(data);
    try {
      await use({
        url: running.url,
        data,
        restart: async () => {
          await stop(running.child);
          running = await launch(data);
          return running.url;
        },
      });
    } finally {
      await stop(running.child);
      await rm(data, { recursive: true, force: true });
    }
  },
  workshopReady: [
    async ({ page, server }, use) => {
      const external: string[] = [];
      await page.context().route('**/*', (route) => {
        const url = new URL(route.request().url());
        if (url.hostname !== '127.0.0.1') {
          external.push(url.origin);
          return route.abort();
        }
        return route.continue();
      });
      page.on('pageerror', (error) => {
        throw error;
      });
      await page.goto(server.url);
      await expect(page.getByRole('button', { name: /Sprout/ })).toBeVisible();
      await use();
      expect(external).toEqual([]);
    },
    { auto: true },
  ],
});
export async function open(page: Page, url: string, learner = 'Comet') {
  await page.goto(url);
  await page.getByRole('button', { name: new RegExp(learner) }).click();
  await expect(
    page.getByRole('button', { name: 'Check', exact: true }),
  ).toBeVisible();
}
export async function saved(page: Page) {
  await expect(page.locator('.save-line [role="status"]')).toHaveText('Saved');
}
export async function rows(page: Page, n: number, total = 24) {
  for (let i = 0; i < n; i++) {
    await page
      .getByLabel('Row to fill', { exact: true })
      .selectOption({ value: String(i) });
    const fill = page.getByRole('button', { name: 'Fill row', exact: true });
    if (await fill.isEnabled()) await fill.click();
    await expect(
      page.locator(`.cell.occupied[data-cell$=",${i}"]`),
    ).toHaveCount(
      Math.min(
        Number(
          await page.getByLabel('Tiles per row', { exact: true }).inputValue(),
        ),
        total -
          i *
            Number(
              await page
                .getByLabel('Tiles per row', { exact: true })
                .inputValue(),
            ),
      ),
    );
  }
}
export async function screenshot(page: Page, name: string) {
  const requested = process.env.SCREENSHOT_DIR;
  const dir = requested === undefined ? undefined : externalPath(requested);
  if (dir) {
    await mkdir(dir, { recursive: true });
    await page.screenshot({
      path: path.join(dir, name + '.png'),
      fullPage: true,
    });
  }
}
