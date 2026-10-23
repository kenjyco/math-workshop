import { test, open, saved, rows, screenshot } from './fixtures.ts';
import { expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const configured = process.env.WORKSHOP_FACTOR_FIXTURE === '12';
const headers = { 'X-Workshop-Request': '1' };

for (const width of [1366, 390]) {
  test(`count maximum: help, retry, together, Done, restart and history at ${width}`, async ({
    page,
    server,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const max = configured ? 5 : 10;
    const pair = configured ? [2, 3] : [5, 5];
    let session: any;
    // Finite selection through the public start path, never parameter injection.
    for (let i = 0; i < (configured ? 12 : 36); i++) {
      const r = await page.request.post(
        server.url + '/api/learners/sprout/sessions',
        { headers, data: { new: true } },
      );
      expect(r.ok()).toBeTruthy();
      session = await r.json();
      if (session.parameters.a === pair[0] && session.parameters.b === pair[1])
        break;
    }
    expect([session.parameters.a, session.parameters.b]).toEqual(pair);
    await open(page, server.url, 'Sprout');
    await expect(page.locator('.counter')).toHaveCount(max);
    await expect(page.locator('.number-pad button')).toHaveCount(max + 1);
    for (let n = 0; n <= max; n++)
      await expect(
        page.getByRole('button', { name: `Answer ${n}`, exact: true }),
      ).toBeVisible();
    for (const el of await page.locator('.counter,.number-pad button').all()) {
      const box = await el.boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    await page.getByRole('button', { name: 'Together', exact: true }).click();
    await expect(page.locator('.counter')).toHaveCount(max);
    await page.getByRole('button', { name: 'Apart', exact: true }).click();
    await page.getByRole('button', { name: 'Answer 0', exact: true }).click();
    await page.getByRole('button', { name: 'Check', exact: true }).click();
    await expect(page.locator('.feedback')).toContainText('You chose 0');
    await page.getByRole('button', { name: 'Help', exact: true }).click();
    for (let i = 0; i < max; i++)
      await page
        .getByRole('button', { name: 'Count one', exact: true })
        .click();
    await expect(page.locator('.counter.counted')).toHaveCount(max);
    await expect(
      page.getByRole('button', { name: 'Count one', exact: true }),
    ).toBeDisabled();
    await page.getByRole('button', { name: 'Recount', exact: true }).click();
    await expect(page.locator('.counter.counted')).toHaveCount(0);
    await page
      .getByRole('button', { name: `Counter ${max}, group 2`, exact: true })
      .click();
    await page
      .getByRole('button', { name: `Answer ${max}`, exact: true })
      .click();
    await saved(page);
    await screenshot(page, `count-${pair.join('-')}-${width}-help`);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page
      .getByRole('button', { name: 'Done for now', exact: true })
      .click();
    let history = await (
      await page.request.get(server.url + '/api/history')
    ).json();
    expect(history).toHaveLength(1);
    await open(page, server.url, 'Sprout');
    await expect(
      page.getByRole('button', { name: `Answer ${max}`, exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.counter.counted')).toHaveCount(1);
    const url = await server.restart();
    await open(page, url, 'Sprout');
    await page.getByRole('button', { name: 'Check', exact: true }).click();
    await expect(page.locator('.feedback')).toContainText(
      `${pair[0]} + ${pair[1]} = ${max}`,
    );
    await page
      .getByRole('button', { name: 'For grown-ups', exact: true })
      .click();
    await expect(page.locator('.history')).toContainText(
      `${pair[0]} + ${pair[1]} = ? · Chose ${max}`,
    );
    await expect(page.locator('.history')).toContainText('Help used');
    await screenshot(page, `count-${pair.join('-')}-${width}-history`);
    history = await (await page.request.get(url + '/api/history')).json();
    expect(history).toHaveLength(2);
    expect(history[0].result.assistance).toBe(1);
    expect(history[1].result.assistance).toBe(0);
  });
}

test('configured factor contract renders, fills partial rows, saves, checks and restarts', async ({
  page,
  server,
}) => {
  const n = configured ? 12 : 24,
    start = configured ? 4 : 6,
    height = configured ? 3 : 4,
    pairs = configured ? 3 : 4;
  await open(page, server.url);
  await expect(page.locator('.inventory')).toContainText(`${n} total`);
  await expect(page.locator('.tray-tile')).toHaveCount(n);
  await expect(
    page.getByLabel('Tiles per row', { exact: true }).locator('option'),
  ).toHaveCount(n);
  await expect(page.locator('.discoveries')).toContainText(
    `There are ${pairs} factor pairs to find for ${n}.`,
  );
  await page.getByRole('button', { name: 'Help', exact: true }).click();
  const example = page.getByRole('button', {
    name: `Show a ${start} × ${height} arrangement`,
    exact: true,
  });
  await expect(example).toBeVisible();
  // Assistance acknowledgment precedes disclosure/placement.
  let release!: () => void;
  await page.route('**/assist', async (route) => {
    await new Promise<void>((resolve) => (release = resolve));
    await route.continue();
  });
  await example.click();
  await expect(page.locator('.cell.occupied')).toHaveCount(0);
  await expect.poll(() => typeof release).toBe('function');
  release();
  await expect(page.locator('.cell.occupied')).toHaveCount(n);
  await page.unroute('**/assist');
  expect(
    await (await page.request.get(server.url + '/api/history')).json(),
  ).toEqual([]);
  await page.getByRole('button', { name: 'Check', exact: true }).click();
  await expect(page.locator('.feedback')).toContainText(
    `${start} × ${height} = ${height} × ${start} = ${n}`,
  );
  await expect(page.locator('.discoveries')).toContainText(
    `1 of ${pairs} found · ${pairs - 1} more to find.`,
  );
  await page.getByRole('button', { name: 'Turn ↻', exact: true }).click();
  await page.getByRole('button', { name: 'Check', exact: true }).click();
  await expect(page.locator('.feedback')).toContainText(
    `${height} × ${start} = ${start} × ${height} = ${n}`,
  );
  await expect(page.locator('.discoveries')).toContainText(
    `1 of ${pairs} found · ${pairs - 1} more to find.`,
  );
  await page.getByLabel('Tiles per row', { exact: true }).selectOption('5');
  await page.getByRole('button', { name: 'Reset board', exact: true }).click();
  await rows(page, Math.ceil(n / 5), n);
  await expect(page.locator('.cell.occupied')).toHaveCount(n);
  await page.getByRole('button', { name: 'Check', exact: true }).click();
  await expect(page.locator('.feedback')).toContainText(
    `has ${Math.ceil(n / 5) * 5 - n} empty`,
  );
  await saved(page);
  await page.getByRole('button', { name: 'Done for now', exact: true }).click();
  const url = await server.restart();
  await open(page, url);
  await expect(page.locator('.cell.occupied')).toHaveCount(n);
  await expect(page.locator('.discoveries')).toContainText(
    `1 of ${pairs} found · ${pairs - 1} more to find.`,
  );
  await screenshot(page, `factor-${n}-gaps`);
  await page
    .getByRole('button', { name: `New practice (${n} tiles)`, exact: true })
    .click();
  await expect(page.locator('.cell.occupied')).toHaveCount(0);
  await expect(page.locator('.tray-tile')).toHaveCount(n);
  await page
    .getByRole('button', { name: 'For grown-ups', exact: true })
    .click();
  await expect(page.locator('.settings-grid')).toContainText(`${n} unit tiles`);
  await expect(page.locator('.settings-grid')).toContainText(
    `${pairs} unordered factor pairs`,
  );
  await expect(page.locator('.history li')).toHaveCount(3);
});
