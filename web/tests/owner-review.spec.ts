import { test, open, saved, rows, screenshot } from './fixtures.ts';
import { expect, type Page } from '@playwright/test';

const button = (page: Page, name: string) =>
  page.getByRole('button', { name, exact: true });
async function current(page: Page, learner: string) {
  return page.evaluate(
    async (learner) =>
      (
        await fetch(`/api/learners/${learner.toLowerCase()}/sessions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Workshop-Request': '1',
          },
          body: '{"new":false}',
        })
      ).json(),
    learner,
  );
}
const history = (page: Page) =>
  page.evaluate(async () => (await fetch('/api/history')).json());
async function edit(page: Page, learner: string, second = false) {
  if (learner === 'Sprout')
    await button(page, second ? 'Answer 2' : 'Answer 3').click();
  else {
    await page
      .getByLabel('Row to fill', { exact: true })
      .selectOption({ value: second ? '1' : '0' });
    await button(page, 'Fill row').click();
  }
}
async function home(page: Page) {
  await expect(
    page.getByRole('heading', { name: 'Let’s work it out.' }),
  ).toBeVisible();
}
async function reopen(page: Page, learner: string) {
  await page.getByRole('button', { name: new RegExp(learner) }).click();
  await expect(button(page, 'Done for now')).toBeVisible();
}

for (const learner of ['Sprout', 'Comet']) {
  test(`${learner}: Done awaits saves, resumes the same work, and saved exit creates no attempt`, async ({
    page,
    server,
  }) => {
    await open(page, server.url, learner);
    await button(page, 'Help').click();
    const before = await current(page, learner);
    let release!: () => void, arrival!: () => void;
    const held = new Promise<void>((r) => {
      release = r;
    });
    const arrived = new Promise<void>((r) => {
      arrival = r;
    });
    await page.route('**/draft', async (route) => {
      const response = await route.fetch();
      arrival();
      await held;
      await route.fulfill({ response });
    });
    await edit(page, learner);
    await arrived;
    await button(page, 'Done for now').click();
    await expect(page.locator('.save-line [role="status"]')).toHaveText(
      'Saving…',
    );
    await expect(page.locator('.activity-heading')).toBeVisible();
    release();
    await home(page);
    await page.unroute('**/draft');
    await expect(
      page.getByRole('heading', { name: 'Let’s work it out.' }),
    ).toBeFocused();
    await reopen(page, learner);
    const after = await current(page, learner);
    expect(after.id).toBe(before.id);
    expect(after.assistance).toBe(1);
    if (learner === 'Sprout') expect(after.draft.count.answer).toBe(3);
    else expect(after.draft.factor.tiles).toHaveLength(6);
    expect(await history(page)).toHaveLength(0);
    await button(page, 'Done for now').click();
    await home(page);
    await expect(
      page.getByRole('region', { name: 'Leave without latest edits?' }),
    ).toHaveCount(0);
    expect(await history(page)).toHaveLength(0);
  });
  test(`${learner}: failed save offers stay, retry, or explicit departure without latest edits`, async ({
    page,
    server,
  }) => {
    await open(page, server.url, learner);
    await edit(page, learner);
    await saved(page);
    const acknowledged = await current(page, learner);
    const fail = () =>
      page.route('**/draft', (route) =>
        route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: '{"error":"synthetic storage failure"}',
        }),
      );
    await fail();
    await edit(page, learner, true);
    await expect(page.locator('.save-line [role="status"]')).toHaveText(
      'Save failed',
    );
    await button(page, 'Done for now').click();
    await expect(button(page, 'Stay here')).toBeFocused();
    await button(page, 'Stay here').click();
    await expect(button(page, 'Done for now')).toBeFocused();
    await button(page, 'Done for now').click();
    await page.unroute('**/draft');
    await button(page, 'Retry save and leave').click();
    await home(page);
    await reopen(page, learner);
    const retried = await current(page, learner);
    expect(retried.id).toBe(acknowledged.id);
    expect(retried.draft).not.toEqual(acknowledged.draft);
    await fail();
    if (learner === 'Sprout') await button(page, 'Answer 1').click();
    else await button(page, 'Reset board').click();
    await expect(page.locator('.save-line [role="status"]')).toHaveText(
      'Save failed',
    );
    await button(page, 'Done for now').click();
    await button(page, 'Leave without latest edits').click();
    await home(page);
    await page.unroute('**/draft');
    await reopen(page, learner);
    expect((await current(page, learner)).draft).toEqual(retried.draft);
    expect(await history(page)).toHaveLength(0);
  });
  test(`${learner}: conflict departure never overwrites the other tab or erases help`, async ({
    page,
    server,
    context,
  }) => {
    await open(page, server.url, learner);
    const other = await context.newPage();
    await open(other, server.url, learner);
    await edit(other, learner);
    await saved(other);
    const authoritative = await current(other, learner);
    await edit(page, learner, true);
    await expect(page.locator('.save-line [role="status"]')).toHaveText(
      'Conflict',
    );
    await button(page, 'Help').click();
    await button(page, 'Done for now').click();
    await button(page, 'Retry save and leave').click();
    await expect(page.locator('.save-line [role="status"]')).toHaveText(
      'Conflict',
    );
    await button(page, 'Leave without latest edits').click();
    await home(page);
    await reopen(page, learner);
    const resumed = await current(page, learner);
    expect(resumed.id).toBe(authoritative.id);
    expect(resumed.draft).toEqual(authoritative.draft);
    expect(resumed.assistance).toBe(1);
    expect(await history(page)).toHaveLength(0);
    await other.close();
  });
  test(`${learner}: uncertain Check survives Done and reload; retry is one attempt, later assisted Check is new`, async ({
    page,
    server,
  }) => {
    await open(page, server.url, learner);
    if (learner === 'Sprout') await edit(page, learner);
    else await rows(page, 4);
    await saved(page);
    const original = await current(page, learner);
    const ids: string[] = [];
    let first = true;
    await page.route('**/attempts', async (route) => {
      ids.push(route.request().postDataJSON().submissionId);
      if (first) {
        first = false;
        await route.fetch();
        await route.abort('failed');
      } else await route.continue();
    });
    await button(page, 'Check').click();
    await expect(page.getByRole('alert')).toContainText('Could not confirm');
    await expect(button(page, 'Help')).toBeDisabled();
    await button(page, 'Done for now').click();
    await home(page);
    await reopen(page, learner === 'Sprout' ? 'Comet' : 'Sprout');
    await expect(page.locator('.feedback')).toBeEmpty();
    await button(page, 'Done for now').click();
    await page.reload();
    await reopen(page, learner);
    await expect(page.getByRole('alert')).toContainText('Could not confirm');
    expect((await current(page, learner)).id).toBe(original.id);
    await button(page, 'Check').click();
    await expect(page.locator('.feedback')).toHaveClass(/correct/);
    expect(ids).toHaveLength(2);
    expect(ids[0]).toBe(ids[1]);
    expect(await history(page)).toHaveLength(1);
    await button(page, 'Help').click();
    await button(page, 'Check').click();
    await expect(page.locator('.feedback')).toHaveClass(/correct/);
    await expect.poll(async () => (await history(page)).length).toBe(2);
    const attempts = await history(page);
    expect(attempts[0].result.assistance).toBe(1);
    expect(attempts[1].result.assistance).toBe(0);
    expect(ids[2]).not.toBe(ids[0]);
  });
  test(`${learner}: Done during in-flight Check isolates the late reply from another learner`, async ({
    page,
    server,
  }) => {
    await open(page, server.url, learner);
    await edit(page, learner);
    await saved(page);
    let release!: () => void, arrival!: () => void;
    const held = new Promise<void>((r) => {
        release = r;
      }),
      arrived = new Promise<void>((r) => {
        arrival = r;
      });
    await page.route('**/attempts', async (route) => {
      const response = await route.fetch();
      arrival();
      await held;
      await route.fulfill({ response });
    });
    await button(page, 'Check').click();
    await arrived;
    await button(page, 'Done for now').click();
    await home(page);
    await reopen(page, learner === 'Sprout' ? 'Comet' : 'Sprout');
    release();
    await expect(page.locator('.feedback')).toBeEmpty();
    await expect(page.locator('.pair-list span')).toHaveCount(0);
    expect(await history(page)).toHaveLength(1);
    await button(page, 'Done for now').click();
    await reopen(page, learner);
    await expect(button(page, 'Check')).not.toHaveText('Checking…');
    expect(await history(page)).toHaveLength(1);
  });
}

test('zero-aware feedback and immutable adult problem/response history', async ({
  page,
  server,
}) => {
  await open(page, server.url, 'Sprout');
  await button(page, 'Answer 2').click();
  await button(page, 'Check').click();
  await expect(page.locator('.feedback')).toContainText(
    'You chose 2. Count once more',
  );
  await button(page, 'Answer 3').click();
  await button(page, 'Check').click();
  await button(page, 'Next →').click();
  await expect(page.locator('.counter')).toHaveCount(0);
  await button(page, 'Answer 1').click();
  await button(page, 'Check').click();
  await expect(page.locator('.feedback')).toHaveText(
    'Both groups are empty. Try again.',
  );
  await button(page, 'Help').click();
  await expect(page.locator('.help-box')).toContainText(
    'Zero means none. Choose 0.',
  );
  await expect(button(page, 'Count one')).toHaveCount(0);
  await expect(page.locator('.help-box')).not.toContainText('Tap');
  await button(page, 'Answer 0').click();
  await button(page, 'Check').click();
  await expect(page.locator('.feedback')).toContainText('0 + 0 = 0');
  await screenshot(page, 'review-zero-help');
  await button(page, 'Next →').click();
  await button(page, 'Answer 1').click();
  await button(page, 'Check').click();
  await expect(page.locator('.feedback')).toContainText(
    'Count the counters in the other group',
  );
  await button(page, 'Help').click();
  await expect(page.locator('.help-box')).toContainText(
    'Tap each counter in the other group once',
  );
  await button(page, 'Answer 4').click();
  await button(page, 'Check').click();
  await expect(page.locator('.feedback')).toContainText('0 + 4 = 4');
  await button(page, 'For grown-ups').click();
  await expect(page.locator('.history li')).toHaveCount(6);
  await expect(
    page.locator('.history li').filter({ hasText: '2 + 1 = ? · Chose 2' }),
  ).toContainText('try again');
  await expect(
    page.locator('.history li').filter({ hasText: '0 + 0 = ? · Chose 1' }),
  ).toContainText('No help disclosed');
  await expect(
    page.locator('.history li').filter({ hasText: '0 + 0 = ? · Chose 0' }),
  ).toContainText('Help used');
  const attempts = await history(page);
  expect(
    attempts.find(
      (a: any) =>
        a.parameters.a === 0 &&
        a.parameters.b === 0 &&
        a.submission.count.answer === 0,
    ).result.assistance,
  ).toBe(2);
  for (const item of attempts) {
    expect(item.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(item.result.feedbackVersion).toBe('feedback-v2');
  }
  await screenshot(page, 'review-history-count');
});

test('equivalence, bounded full rows, unordered tile identities, worked help and fixed-24 new practice', async ({
  page,
  server,
}) => {
  await open(page, server.url);
  await rows(page, 4);
  await button(page, 'Check').click();
  await expect(page.locator('.feedback')).toHaveText(
    '6 × 4 = 4 × 6 = 24. Same tiles. Same factor pair.',
  );
  await button(page, 'Turn ↻').click();
  await expect(page.locator('.feedback')).toBeEmpty();
  await button(page, 'Check').click();
  await expect(page.locator('.feedback')).toContainText('4 × 6 = 6 × 4 = 24');
  await expect(page.locator('.pair-list span')).toHaveCount(1);
  await button(page, 'Reset board').click();
  await page.getByLabel('Tiles per row', { exact: true }).selectOption('8');
  await button(page, 'Tray tile 24').focus();
  await page.keyboard.press('Enter');
  await page.locator('[data-cell="0,0"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-cell="0,0"]')).toHaveText('24');
  await button(page, 'Fill row').click();
  await expect(button(page, 'Fill row')).toBeDisabled();
  await expect(page.locator('.row-note')).toContainText('This row is full');
  await expect(page.locator('.cell.occupied')).toHaveCount(8);
  await page
    .getByLabel('Row to fill', { exact: true })
    .selectOption({ value: '1' });
  await button(page, 'Fill row').click();
  await page
    .getByLabel('Row to fill', { exact: true })
    .selectOption({ value: '2' });
  await button(page, 'Fill row').click();
  await expect(page.locator('[data-cell="0,0"]')).toHaveText('24');
  await button(page, 'Check').click();
  await expect(page.locator('.feedback')).toContainText('8 × 3 = 3 × 8 = 24');
  await expect(page.locator('.pair-list span')).toHaveCount(2);
  const old = await current(page, 'Comet');
  expect(old.discoveries).toEqual(['3 × 8', '4 × 6']);
  await button(page, 'For grown-ups').click();
  await expect(page.locator('.history li').first()).toContainText(
    '8 columns × 3 rows · 24 placed · 0 gaps · 0 in tray',
  );
  await screenshot(page, 'review-history-factor');
  await button(page, 'Home').click();
  await reopen(page, 'Comet');
  await button(page, 'New practice (24 tiles)').click();
  const fresh = await current(page, 'Comet');
  expect(fresh.id).not.toBe(old.id);
  expect(fresh.parameters.total).toBe(24);
  expect(fresh.discoveries).toEqual([]);
  expect(await history(page)).toHaveLength(3);
  await button(page, 'Help').click();
  await button(page, 'Show a 6 × 4 arrangement').click();
  await expect(page.locator('.cell.occupied')).toHaveCount(24);
  await expect(page.locator('.tile-tray button')).toHaveCount(0);
  await expect(page.locator('.pair-list span')).toHaveCount(0);
  expect(await history(page)).toHaveLength(3);
  expect((await current(page, 'Comet')).assistance).toBe(2);
  await button(page, 'Undo').click();
  await button(page, 'Reset board').click();
  await button(page, 'Done for now').click();
  await reopen(page, 'Comet');
  await expect(page.getByText('Worked arrangement seen')).toBeVisible();
});

test('overview shows the exact gapped frame; pan availability and focused end cells follow both long orientations', async ({
  page,
  server,
}) => {
  await open(page, server.url);
  await expect(page.locator('.shape-overview')).toHaveCount(0);
  for (const width of [12, 24]) {
    await page.setViewportSize({ width: 390, height: 844 });
    await button(page, 'Reset board').click();
    await page
      .getByLabel('Tiles per row', { exact: true })
      .selectOption(String(width));
    await button(page, 'Tray tile 24').click();
    await page.locator('[data-cell="0,0"]').click();
    await saved(page);
    await expect(page.locator('.shape-overview')).toContainText(
      'same tiles, not extra tiles',
    );
    await expect(page.locator('.shape-overview rect')).toHaveCount(24);
    await expect(page.locator('.shape-overview rect.filled')).toHaveCount(1);
    const svg = page.locator('.shape-overview svg');
    await expect(svg).toHaveAttribute('viewBox', `0 0 ${width} ${24 / width}`);
    const box = (await svg.boundingBox())!;
    expect(box.width / box.height).toBeCloseTo(width / (24 / width), 1);
    await expect(button(page, 'Pan left')).toBeDisabled();
    await expect(button(page, 'Pan right')).toBeEnabled();
    await expect(button(page, 'Pan up')).toBeDisabled();
    await expect(button(page, 'Pan down')).toBeDisabled();
    await page.locator(`[data-cell="${width - 1},0"]`).focus();
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowRight');
    await expect(page.locator(`[data-cell="${width - 1},0"]`)).toBeInViewport();
    await expect(button(page, 'Pan right')).toBeDisabled();
    await button(page, 'Turn ↻').click();
    await expect(button(page, 'Turn ↻')).toBeFocused();
    await expect(svg).toHaveAttribute('viewBox', `0 0 ${24 / width} ${width}`);
    await expect(page.locator('.shape-overview rect.filled')).toHaveCount(1);
    await expect(button(page, 'Pan down')).toBeDisabled();
    await expect(button(page, 'Pan up')).toBeEnabled();
    await page.locator(`[data-cell="0,${width - 1}"]`).focus();
    await expect(page.locator(`[data-cell="0,${width - 1}"]`)).toBeInViewport();
    await expect(page.locator('[data-cell="0,0"]')).toHaveText('24');
    await button(page, 'Check').click();
    await expect(page.locator('.feedback')).toContainText('23 tiles are still');
    await expect(page.locator('.feedback')).not.toHaveClass(/correct/);
    await screenshot(page, `review-${width}-vertical-partial`);
    await page
      .getByLabel('Row to fill', { exact: true })
      .selectOption({ value: '0' });
    await rows(page, width);
    await expect(page.locator('.shape-overview rect.filled')).toHaveCount(24);
    await button(page, 'Check').click();
    await expect(page.locator('.feedback')).toHaveClass(/correct/);
    await button(page, 'Turn ↻').click();
    await expect(svg).toHaveAttribute('viewBox', `0 0 ${width} ${24 / width}`);
    await expect(page.locator('[data-cell="0,0"]')).toHaveText('24');
    await expect(page.locator('.cell.occupied')).toHaveCount(24);
    await screenshot(page, `review-${width}-horizontal-complete`);
    if (width === 24)
      await expect(page.locator('.dimensions')).toHaveText(
        '24 columns × 1 row',
      );
  }
});

test('a stalled save gives a bounded departure choice without cancelling its request', async ({
  page,
  server,
}) => {
  await open(page, server.url, 'Sprout');
  let release!: () => void, arrival!: () => void;
  let delivered!: () => void;
  const delivery = new Promise<void>((resolve) => {
    delivered = resolve;
  });
  const held = new Promise<void>((r) => {
      release = r;
    }),
    arrived = new Promise<void>((r) => {
      arrival = r;
    });
  await page.route('**/draft', async (route) => {
    const response = await route.fetch();
    arrival();
    await held;
    await route.fulfill({ response });
    delivered();
  });
  await button(page, 'Answer 3').click();
  await arrived;
  await button(page, 'Done for now').click();
  await expect(button(page, 'Stay here')).toBeFocused({ timeout: 6000 });
  await expect(page.locator('.save-line [role="status"]')).toHaveText(
    'Saving…',
  );
  await button(page, 'Leave without latest edits').click();
  await home(page);
  release();
  await delivery;
  await page.unroute('**/draft');
  await reopen(page, 'Sprout');
  await expect(button(page, 'Answer 3')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(await history(page)).toHaveLength(0);
});

test('touch and pan reach long-frame end cells without moving another tile', async ({
  browser,
  server,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
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
    for (const width of [12, 24]) {
      await button(page, 'Reset board').tap();
      await page
        .getByLabel('Tiles per row', { exact: true })
        .selectOption(String(width));
      await button(page, 'Tray tile 24').tap();
      while (await button(page, 'Pan right').isEnabled())
        await button(page, 'Pan right').tap();
      const end = page.locator(`[data-cell="${width - 1},0"]`);
      await end.tap();
      await expect(end).toHaveText('24');
      await button(page, 'Turn ↻').tap();
      const turned = page.locator(`[data-cell="0,${width - 1}"]`);
      await turned.tap();
      await button(page, 'Return selected tile').tap();
      await expect(page.locator('.cell.occupied')).toHaveCount(0);
      await button(page, 'Undo').tap();
      await expect(turned).toHaveText('24');
      await expect(page.locator('.tile-tray button')).toHaveCount(23);
      await screenshot(page, `review-touch-${width}-end`);
    }
    expect(external).toEqual([]);
  } finally {
    await context.close();
  }
});

test('late correct factor reply records its submitted pair without grading a newly emptied board', async ({
  page,
  server,
}) => {
  await open(page, server.url);
  await rows(page, 4);
  await saved(page);
  let release!: () => void, arrival!: () => void;
  const held = new Promise<void>((r) => {
      release = r;
    }),
    arrived = new Promise<void>((r) => {
      arrival = r;
    });
  await page.route('**/attempts', async (route) => {
    const response = await route.fetch();
    arrival();
    await held;
    await route.fulfill({ response });
  });
  await button(page, 'Check').click();
  await arrived;
  await button(page, 'Reset board').click();
  release();
  await expect(button(page, 'Check')).toBeEnabled();
  await expect(page.locator('.feedback')).toBeEmpty();
  await expect(page.locator('.cell.occupied')).toHaveCount(0);
  await expect(page.locator('.pair-list span')).toHaveCount(1);
  const attempts = await history(page);
  expect(attempts).toHaveLength(1);
  expect(attempts[0].submission.factor.tiles).toHaveLength(24);
  expect(attempts[0].result.outcome).toBe('correct');
});
