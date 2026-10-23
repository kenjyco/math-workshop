import { test, open, saved, rows, screenshot } from './fixtures.ts';
import { expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
test('count: retry, help, together, zero, total five, profile separation and restart', async ({
  page,
  server,
}) => {
  await screenshot(page, 'home-laptop');
  await page.getByRole('button', { name: /Sprout/ }).click();
  await expect(page.locator('.counter')).toHaveCount(3);
  await page
    .getByRole('button', { name: 'Counter 1, group 1', exact: true })
    .click();
  await page.getByRole('button', { name: 'Together', exact: true }).click();
  await expect(page.locator('.counter')).toHaveCount(3);
  await page.getByRole('button', { name: 'Answer 2', exact: true }).click();
  await page.getByRole('button', { name: 'Check', exact: true }).click();
  await expect(page.locator('.feedback')).toContainText('You chose 2');
  await expect(page.locator('.counter.counted')).toHaveCount(1);
  await page.getByRole('button', { name: 'Help', exact: true }).click();
  await page.getByRole('button', { name: 'Count one', exact: true }).click();
  await expect(page.getByText('2 counted.')).toBeVisible();
  await page.getByRole('button', { name: 'Answer 3', exact: true }).click();
  await page.getByRole('button', { name: 'Check', exact: true }).click();
  await expect(page.locator('.feedback')).toContainText('2 + 1 = 3');
  await saved(page);
  await screenshot(page, 'count-help-laptop');
  await page.getByRole('button', { name: 'Next →' }).click();
  await expect(page.locator('.counter')).toHaveCount(0);
  await expect(page.locator('.empty-group')).toHaveCount(2);
  await page.getByRole('button', { name: 'Answer 0', exact: true }).click();
  await page.getByRole('button', { name: 'Check', exact: true }).click();
  await expect(page.locator('.feedback')).toContainText('0 + 0 = 0');
  await page.getByRole('button', { name: 'Next →' }).click();
  await expect(page.locator('.counter')).toHaveCount(4);
  await expect(page.locator('.empty-group')).toHaveCount(1);
  await page.getByRole('button', { name: 'Answer 4', exact: true }).click();
  await page.getByRole('button', { name: 'Check', exact: true }).click();
  await expect(page.locator('.feedback')).toContainText('0 + 4 = 4');
  await page.getByRole('button', { name: 'Next →' }).click();
  await expect(page.locator('.counter')).toHaveCount(5);
  await page.getByRole('button', { name: 'Answer 5', exact: true }).click();
  await saved(page);
  await page.getByRole('button', { name: 'Switch learner' }).click();
  await page.getByRole('button', { name: /Comet/ }).click();
  await expect(page.locator('.cell.occupied')).toHaveCount(0);
  await page.getByRole('button', { name: 'Switch learner' }).click();
  await page.getByRole('button', { name: /Sprout/ }).click();
  await expect(
    page.getByRole('button', { name: 'Answer 5', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  const url = await server.restart();
  await open(page, url, 'Sprout');
  await expect(
    page.getByRole('button', { name: 'Answer 5', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Check', exact: true }).click();
  await expect(page.locator('.feedback')).toContainText('2 + 3 = 5');
  await page.getByRole('button', { name: 'For grown-ups' }).click();
  await expect(page.locator('.history')).toContainText('Help used');
  await expect(page.locator('.history li')).toHaveCount(5);
});
test('factor: tap, keyboard, resize, undo, exact rotation, gap and discoveries', async ({
  page,
  server,
}) => {
  await open(page, server.url);
  await page.getByRole('button', { name: 'Tray tile 1', exact: true }).click();
  await page.locator('[data-cell="0,0"]').click();
  await expect(page.locator('.cell.occupied')).toHaveCount(1);
  await page.locator('[data-cell="0,0"]').click();
  await page.getByRole('button', { name: 'Return selected tile' }).click();
  await expect(page.locator('.cell.occupied')).toHaveCount(0);
  await page.getByRole('button', { name: 'Tray tile 2', exact: true }).focus();
  await page.keyboard.press('Enter');
  await page.locator('[data-cell="0,0"]').focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-cell="1,0"]')).toHaveText('2');
  await page.keyboard.press('Delete');
  await expect(page.locator('.cell.occupied')).toHaveCount(0);
  await page.getByRole('button', { name: 'Check', exact: true }).click();
  await expect(page.locator('.feedback')).toContainText('24 tiles are still');
  await rows(page, 4);
  await page.getByRole('button', { name: 'Check', exact: true }).click();
  await expect(page.locator('.feedback')).toContainText('6 × 4 = 4 × 6 = 24');
  await expect(page.locator('.pair-list span')).toHaveText('4 × 6 = 6 × 4');
  await page.getByRole('button', { name: 'Turn ↻' }).click();
  await expect(page.locator('.dimensions')).toHaveText('4 columns × 6 rows');
  await expect(page.locator('[data-cell="1,0"]')).toHaveText('7');
  await page.getByRole('button', { name: 'Check', exact: true }).click();
  await expect(page.locator('.pair-list span')).toHaveCount(1);
  await page.getByLabel('Tiles per row', { exact: true }).selectOption('5');
  await expect(page.locator('.cell.occupied')).toHaveCount(20);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.locator('.cell.occupied')).toHaveCount(24);
  await expect(page.locator('.dimensions')).toHaveText('4 columns × 6 rows');
  await page.getByRole('button', { name: 'Reset board', exact: true }).click();
  await page.getByLabel('Tiles per row', { exact: true }).selectOption('5');
  await rows(page, 5);
  await page.getByRole('button', { name: 'Check', exact: true }).click();
  await expect(page.locator('.feedback')).toContainText('1 empty cell');
  await expect(page.locator('.pair-list span')).toHaveCount(1);
  await page.getByRole('button', { name: 'Turn ↻' }).click();
  await expect(page.locator('[data-cell="4,4"]')).toBeEmpty();
  await page.getByRole('button', { name: 'Help', exact: true }).click();
  await page.getByRole('button', { name: 'Show a 6 × 4 arrangement' }).click();
  await expect(page.getByText('Worked arrangement seen')).toBeVisible();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByText('Worked arrangement seen')).toBeVisible();
  await saved(page);
  await screenshot(page, 'factor-gap-laptop');
  await page.reload();
  await page.getByRole('button', { name: /Comet/ }).click();
  await expect(page.locator('.cell.occupied')).toHaveCount(24);
  await expect(page.locator('.dimensions')).toHaveText('5 columns × 5 rows');
  await expect(page.getByText('Worked arrangement seen')).toBeVisible();
});
test('real pointer drags: occupied, outside, cancellation, lost capture and valid drop', async ({
  page,
  server,
}) => {
  await open(page, server.url);
  const tile = page.getByRole('button', { name: 'Tray tile 1', exact: true });
  const target = page.locator('[data-cell="0,0"]');
  const from = (await tile.boundingBox())!,
    to = (await target.boundingBox())!;
  await page.mouse.move(from.x + 20, from.y + 20);
  await page.mouse.down();
  await page.mouse.move(to.x + 20, to.y + 20, { steps: 8 });
  await expect(target).toHaveClass(/drop-target/);
  await page.mouse.up();
  await expect(target).toHaveText('1');
  const second = page.getByRole('button', { name: 'Tray tile 2', exact: true });
  const start = (await second.boundingBox())!;
  for (const mode of ['occupied', 'outside', 'cancel', 'lost']) {
    await page.mouse.move(start.x + 20, start.y + 20);
    await page.mouse.down();
    await page.mouse.move(
      mode === 'outside' ? 5 : to.x + 20,
      mode === 'outside' ? 5 : to.y + 20,
      { steps: 5 },
    );
    if (mode === 'cancel')
      await second.dispatchEvent('pointercancel', { pointerId: 1 });
    if (mode === 'lost')
      await second.evaluate((el) => {
        if (el.hasPointerCapture(1)) el.releasePointerCapture(1);
      });
    await page.mouse.up();
    await expect(page.locator('.cell.occupied')).toHaveCount(1);
    await expect(second).toBeVisible();
  }
  const moved = (await target.boundingBox())!;
  const end = (await page.locator('[data-cell="1,0"]').boundingBox())!;
  await page.mouse.move(moved.x + 20, moved.y + 20);
  await page.mouse.down();
  await page.mouse.move(end.x + 20, end.y + 20, { steps: 8 });
  await page.mouse.up();
  await expect(page.locator('[data-cell="1,0"]')).toHaveText('1');
  await expect(page.locator('.tile-tray button')).toHaveCount(23);
  // A pointer drop chooses its actual row; Fill row/undo/Turn preserve that ID.
  const source = (await page.locator('[data-cell="1,0"]').boundingBox())!;
  const destination = (await page.locator('[data-cell="2,1"]').boundingBox())!;
  await page.mouse.move(source.x + 20, source.y + 20);
  await page.mouse.down();
  await page.mouse.move(destination.x + 20, destination.y + 20, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByLabel('Row to fill', { exact: true })).toHaveValue(
    '1',
  );
  await page.getByRole('button', { name: 'Fill row', exact: true }).click();
  await expect(page.locator('.cell.occupied[data-cell$=",1"]')).toHaveCount(6);
  await expect(page.locator('.cell.occupied[data-cell$=",0"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.locator('[data-cell="2,1"]')).toHaveText('1');
  await page.getByRole('button', { name: 'Turn ↻' }).click();
  await expect(page.locator('[data-cell="1,2"]')).toHaveText('1');
  await expect(page.locator('.cell.occupied')).toHaveCount(1);
});
test('long rectangles remain exact; pan, keyboard scrolling, tablet/narrow and accessibility', async ({
  page,
  server,
}) => {
  await open(page, server.url);
  await page.getByLabel('Tiles per row', { exact: true }).selectOption('24');
  await rows(page, 1);
  await page.getByRole('button', { name: 'Pan right' }).click();
  expect(
    await page.locator('.board-viewport').evaluate((el) => el.scrollLeft),
  ).toBeGreaterThan(0);
  await page.locator('[data-cell="23,0"]').focus();
  await expect(page.locator('[data-cell="23,0"]')).toBeInViewport();
  await page.getByRole('button', { name: 'Check', exact: true }).click();
  await expect(page.locator('.feedback')).toContainText('24 × 1 = 1 × 24 = 24');
  await screenshot(page, 'factor-long-horizontal');
  await page.getByRole('button', { name: 'Turn ↻' }).click();
  await expect(page.locator('.dimensions')).toHaveText('1 column × 24 rows');
  await expect(page.getByRole('button', { name: 'Pan down' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Pan up' })).toBeEnabled();
  expect(
    await page.locator('.board-viewport').evaluate((el) => el.scrollTop),
  ).toBeGreaterThan(0);
  await page.locator('[data-cell="0,23"]').focus();
  await expect(page.locator('[data-cell="0,23"]')).toBeInViewport();
  await page.getByRole('button', { name: 'Check', exact: true }).click();
  await expect(page.locator('.pair-list span')).toHaveCount(1);
  for (const [name, width, height] of [
    ['tablet-landscape', 1024, 768],
    ['tablet-portrait', 768, 1024],
    ['narrow', 390, 844],
    ['zoom-equivalent', 683, 450],
  ] as const) {
    await page.setViewportSize({ width, height });
    await expect(
      page.getByRole('button', { name: 'Check', exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const hit = await page.locator('.cell').first().boundingBox();
    expect(hit!.width).toBe(48);
    const scan = await new AxeBuilder({ page }).analyze();
    expect(scan.violations.map((v) => `${v.id}: ${v.description}`)).toEqual([]);
    await screenshot(page, 'factor-' + name);
  }
  await page.getByRole('button', { name: 'Switch learner' }).click();
  await page.getByRole('button', { name: /Sprout/ }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await screenshot(page, 'count-narrow');
});
test('stale tabs recover; delayed save and answer never label newer work or another learner', async ({
  page,
  server,
  context,
}) => {
  await open(page, server.url, 'Sprout');
  const other = await context.newPage();
  await open(other, server.url, 'Sprout');
  await page.getByRole('button', { name: 'Answer 3', exact: true }).click();
  await saved(page);
  await other.getByRole('button', { name: 'Answer 2', exact: true }).click();
  await expect(
    other.getByRole('heading', { name: 'Another tab saved this exercise' }),
  ).toBeVisible();
  await other.getByRole('button', { name: 'Help', exact: true }).click();
  await expect(other.getByText('Help used in this exercise')).toBeVisible();
  await other.getByRole('button', { name: 'Load saved work' }).click();
  await expect(
    other.getByRole('button', { name: 'Answer 3', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(other.getByText('Help used in this exercise')).toBeVisible();
  await other.close();
  let release!: () => void;
  const held = new Promise<void>((r) => (release = r));
  await page.route('**/attempts', async (route) => {
    const response = await route.fetch();
    await held;
    await route.fulfill({ response });
  });
  await page.getByRole('button', { name: 'Check', exact: true }).click();
  await page.getByRole('button', { name: 'Answer 1', exact: true }).click();
  release();
  await expect(
    page.getByRole('button', { name: 'Check', exact: true }),
  ).toBeEnabled();
  await expect(page.locator('.feedback')).toBeEmpty();
  await page.unroute('**/attempts');
  let releaseAgain!: () => void;
  const holdAgain = new Promise<void>((r) => (releaseAgain = r));
  await page.route('**/attempts', async (route) => {
    const response = await route.fetch();
    await holdAgain;
    await route.fulfill({ response });
  });
  await page.getByRole('button', { name: 'Check', exact: true }).click();
  await page.getByRole('button', { name: 'Switch learner' }).click();
  await page.getByRole('button', { name: /Comet/ }).click();
  releaseAgain();
  await expect(page.locator('.feedback')).toBeEmpty();
  await expect(page.locator('.activity-heading')).toContainText('One number');
});
test('executable restart resumes the acknowledged board', async ({
  page,
  server,
}) => {
  await open(page, server.url);
  await page.getByRole('button', { name: 'Fill row', exact: true }).click();
  await saved(page);
  // Restart confirms clean close before a second process reads a copied backup.
  const url = await server.restart();
  await open(page, url);
  await expect(page.locator('.cell.occupied')).toHaveCount(6);
  // The separate Go recovery test copies only after close. Here verify packaged
  // restart behavior; the executable recovery drill is handled by smoke.py.
  expect(
    (await readFile(path.join(server.data, 'workshop.sqlite'))).length,
  ).toBeGreaterThan(0);
});
test('pending and failed saves are visible; concurrent clients keep their profiles', async ({
  page,
  server,
  context,
}) => {
  await open(page, server.url, 'Sprout');
  let release!: () => void;
  let arrival!: () => void;
  const arrived = new Promise<void>((r) => (arrival = r)),
    held = new Promise<void>((r) => (release = r));
  let count = 0;
  await page.route('**/draft', async (route) => {
    count++;
    if (count === 1) {
      const response = await route.fetch();
      arrival();
      await held;
      await route.fulfill({ response });
    } else await route.continue();
  });
  await page.getByRole('button', { name: 'Answer 1', exact: true }).click();
  await arrived;
  await expect(page.locator('.save-line [role="status"]')).toHaveText(
    'Saving…',
  );
  await page.getByRole('button', { name: 'Answer 3', exact: true }).click();
  await expect(page.locator('.save-line [role="status"]')).not.toHaveText(
    'Saved',
  );
  release();
  await saved(page);
  expect(count).toBe(2);
  await page.unroute('**/draft');
  await page.route('**/draft', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Test storage unavailable' }),
    }),
  );
  await page.getByRole('button', { name: 'Together', exact: true }).click();
  await expect(page.locator('.save-line [role="status"]')).toHaveText(
    'Save failed',
  );
  await page.getByRole('button', { name: 'Switch learner' }).click();
  await expect(
    page.getByRole('button', { name: 'Answer 3', exact: true }),
  ).toBeVisible();
  await page.unroute('**/draft');
  await page.getByRole('button', { name: 'Retry save', exact: true }).click();
  await saved(page);
  const comet = await context.newPage();
  await open(comet, server.url);
  await comet.getByRole('button', { name: 'Fill row', exact: true }).click();
  await saved(comet);
  await page.getByRole('button', { name: 'Check', exact: true }).click();
  await expect(page.locator('.feedback')).toContainText('2 + 1 = 3');
  await expect(comet.locator('.cell.occupied')).toHaveCount(6);
  await expect(comet.locator('.feedback')).toBeEmpty();
  await comet.close();
});
test('touch-only placement and enlarged reduced-motion layout', async ({
  browser,
  server,
}) => {
  const context = await browser.newContext({
    viewport: { width: 1024, height: 768 },
    hasTouch: true,
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  const external: string[] = [];
  await context.route('**/*', (route) => {
    if (new URL(route.request().url()).hostname !== '127.0.0.1') {
      external.push(route.request().url());
      return route.abort();
    }
    return route.continue();
  });
  try {
    await page.goto(server.url);
    await page.getByRole('button', { name: /Comet/ }).tap();
    await page.getByRole('button', { name: 'Tray tile 1', exact: true }).tap();
    await page.locator('[data-cell="0,0"]').tap();
    await expect(page.locator('[data-cell="0,0"]')).toHaveText('1');
    await page.locator('[data-cell="0,0"]').tap();
    await page.getByRole('button', { name: 'Return selected tile' }).tap();
    await expect(page.locator('.cell.occupied')).toHaveCount(0);
    await page.setViewportSize({ width: 1366, height: 900 });
    await page.evaluate(() => (document.documentElement.style.zoom = '2'));
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page
      .getByRole('button', { name: 'Check', exact: true })
      .scrollIntoViewIfNeeded();
    await expect(
      page.getByRole('button', { name: 'Check', exact: true }),
    ).toBeInViewport();
    expect(
      await page.evaluate(
        () => matchMedia('(prefers-reduced-motion: reduce)').matches,
      ),
    ).toBe(true);
    await screenshot(page, 'factor-css-zoom-200');
    expect(external).toEqual([]);
  } finally {
    await context.close();
  }
});
test('lost submission response replays once; a later deliberate Check records assistance', async ({
  page,
  server,
}) => {
  await open(page, server.url, 'Sprout');
  await page.getByRole('button', { name: 'Answer 3', exact: true }).click();
  await saved(page);
  let first = true;
  await page.route('**/attempts', async (route) => {
    if (first) {
      first = false;
      await route.fetch();
      await route.abort('failed');
    } else await route.continue();
  });
  await page.getByRole('button', { name: 'Check', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Could not confirm');
  await page.getByRole('button', { name: 'Check', exact: true }).click();
  await expect(page.locator('.feedback')).toContainText('2 + 1 = 3');
  let attempts = await page.evaluate(
    async () => await (await fetch('/api/history')).json(),
  );
  expect(attempts).toHaveLength(1);
  await page.getByRole('button', { name: 'Help', exact: true }).click();
  await page.getByRole('button', { name: 'Check', exact: true }).click();
  await expect(page.locator('.feedback')).toContainText('2 + 1 = 3');
  await expect
    .poll(
      async () =>
        await page.evaluate(
          async () => (await (await fetch('/api/history')).json()).length,
        ),
    )
    .toBe(2);
  attempts = await page.evaluate(
    async () => await (await fetch('/api/history')).json(),
  );
  expect(attempts[0].result.assistance).toBe(1);
  expect(attempts[1].result.assistance).toBe(0);
});
