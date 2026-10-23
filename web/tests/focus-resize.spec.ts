import { test, open, saved, screenshot } from './fixtures.ts';
import { expect, type Page, type Locator } from '@playwright/test';
import type { Board, Attempt, Session } from '../src/lib/types.ts';
const button = (page: Page, name: string) =>
  page.getByRole('button', { name, exact: true });
const width = (page: Page) => page.getByLabel('Tiles per row', { exact: true });
const history = (page: Page): Promise<Attempt[]> =>
  page.evaluate(async () => (await fetch('/api/history')).json());
async function current(page: Page): Promise<Session> {
  return page.evaluate(async () =>
    (
      await fetch('/api/learners/comet/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Workshop-Request': '1',
        },
        body: '{"new":false}',
      })
    ).json(),
  );
}
const original: Board = {
  width: 6,
  height: 4,
  tiles: [
    [18, 1, 0],
    [8, 5, 0],
    [1, 4, 1],
    [13, 5, 1],
    [7, 2, 2],
    [2, 0, 3],
    [3, 1, 3],
    [4, 2, 3],
    [5, 3, 3],
    [6, 4, 3],
    [20, 5, 3],
  ].map(([id, x, y]) => ({ id, x, y })),
};
const narrow: Board = {
  width: 2,
  height: 12,
  tiles: [
    { id: 18, x: 1, y: 0 },
    { id: 2, x: 0, y: 3 },
    { id: 3, x: 1, y: 3 },
  ],
};
const wide: Board = { width: 18, height: 2, tiles: [{ id: 18, x: 1, y: 0 }] };
const returned: Board = {
  width: 6,
  height: 4,
  tiles: [{ id: 18, x: 1, y: 0 }],
};
const sorted = (tiles: Board['tiles']) =>
  [...tiles].sort((a, b) => a.id - b.id);
async function boardIs(page: Page, board: Board) {
  await expect(width(page)).toHaveValue(String(board.width));
  await expect(page.locator('.cell')).toHaveCount(board.width * board.height);
  expect(
    await page.locator('.cell.occupied').evaluateAll((cells) =>
      cells
        .map((cell) => {
          const [x, y] = cell.getAttribute('data-cell')!.split(',').map(Number);
          return { id: Number(cell.textContent), x, y };
        })
        .sort((a, b) => a.id - b.id),
    ),
  ).toEqual(sorted(board.tiles));
  const tray = await page.locator('.tray-tile').allTextContents();
  expect(
    [...board.tiles.map((t) => t.id), ...tray.map(Number)].sort(
      (a, b) => a - b,
    ),
  ).toEqual(Array.from({ length: 24 }, (_, i) => i + 1));
  await expect(page.locator('.inventory')).toContainText(
    `${board.tiles.length} on board`,
  );
  if (board.width === 18 || board.height === 12) {
    const svg = page.locator('.shape-overview svg');
    await expect(svg).toBeVisible();
    await expect(svg).toHaveAttribute(
      'viewBox',
      `0 0 ${board.width} ${board.height}`,
    );
    await expect(svg.locator('rect')).toHaveCount(board.width * board.height);
    expect(
      await svg.locator('rect.filled').evaluateAll((rects) =>
        rects.map((r) => ({
          x: Math.round(Number(r.getAttribute('x'))),
          y: Math.round(Number(r.getAttribute('y'))),
        })),
      ),
    ).toEqual(
      [...board.tiles]
        .sort((a, b) => a.y - b.y || a.x - b.x)
        .map(({ x, y }) => ({ x, y })),
    );
  }
}
async function ring(locator: Locator, forced = false) {
  await expect(locator).toBeFocused();
  const state = await locator.evaluate((el) => {
    const s = getComputedStyle(el),
      r = el.getBoundingClientRect();
    return {
      tag: el.tagName,
      visible: el.matches(':focus-visible'),
      outline: s.outlineStyle,
      width: s.outlineWidth,
      color: s.outlineColor,
      offset: s.outlineOffset,
      border: s.border,
      shadow: s.boxShadow,
      height: r.height,
      boxWidth: r.width,
      invalid: el.getAttribute('aria-invalid'),
    };
  });
  expect(state.visible).toBe(true);
  expect(state.outline).toBe('solid');
  expect(state.width).toBe('3px');
  if (!forced) expect(state.color).toBe('rgb(23, 99, 88)');
  expect(state.invalid).not.toBe('true');
  return state;
}
async function destination(page: Page, name: string, shot: string) {
  const heading = page.getByRole('heading', { name, exact: true });
  await expect(heading).toBeFocused();
  await page.keyboard.press('3');
  const state = await ring(heading);
  expect(state.height).toBeLessThan(200);
  expect(
    await page.locator('main').evaluate((el) => el.matches(':focus')),
  ).toBe(false);
  const main = await page.locator('main').boundingBox();
  expect(state.height * state.boxWidth).toBeLessThan(
    (main!.height * main!.width) / 2,
  );
  console.log(shot, JSON.stringify(state));
  await screenshot(page, shot);
}

for (const viewport of [{ width: 1366, height: 900 }, { width: 390, height: 844 }]) {
  test(`pointer headings stay unoutlined; keyboard navigation stays visible at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    async function pointerHeading(name: string) {
      const heading = page.getByRole('heading', { name, exact: true });
      await expect(heading).toBeFocused();
      for (const click of [false, true]) {
        if (click) {
          await page.locator('footer').click();
          await heading.click();
        }
        await expect(heading).toBeFocused();
        expect(await heading.evaluate((el) => ({
          visible: el.matches(':focus-visible'),
          outline: getComputedStyle(el).outlineStyle,
          tabIndex: (el as HTMLElement).tabIndex,
        }))).toEqual({ visible: false, outline: 'none', tabIndex: -1 });
        expect(await page.locator('main').evaluate((el) => ({
          focused: el.matches(':focus'),
          outline: getComputedStyle(el).outlineStyle,
        }))).toEqual({ focused: false, outline: 'none' });
      }
      await screenshot(page, `pointer-${viewport.width}-${name.replace(/[^a-z]/gi, '')}`);
    }
    await button(page, 'Home').click();
    await pointerHeading('Let’s work it out.');
    await page.getByRole('button', { name: /Sprout/ }).click();
    await pointerHeading('How many?');
    await button(page, 'Done for now').click();
    await pointerHeading('Let’s work it out.');
    await page.getByRole('button', { name: /Comet/ }).click();
    await pointerHeading('One number. Many rectangles.');
    await button(page, 'For grown-ups').click();
    await pointerHeading('A little about this workshop');
    await page.emulateMedia({ forcedColors: 'active' });
    await pointerHeading('A little about this workshop');
    await page.emulateMedia({ forcedColors: 'none' });

    // From the focused heading, traverse the actual keyboard order to Home.
    await page.keyboard.press('Shift+Tab');
    await ring(button(page, 'For grown-ups'));
    await page.keyboard.press('Shift+Tab');
    await ring(button(page, 'Home'));
    await page.keyboard.press('Enter');
    await ring(page.getByRole('heading', { name: 'Let’s work it out.' }));
    await page.keyboard.press('Tab');
    await ring(page.getByRole('button', { name: /Sprout/ }));
    await page.keyboard.press('Enter');
    await ring(page.getByRole('heading', { name: 'How many?' }));
    await page.keyboard.press('Tab');
    await ring(button(page, 'Counter 1, group 1'));
    await page.keyboard.press('Shift+Tab');
    await ring(button(page, 'Done for now'));
    await page.keyboard.press('Enter');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await ring(page.getByRole('button', { name: /Comet/ }));
    await page.keyboard.press('Space');
    await ring(page.getByRole('heading', { name: 'One number. Many rectangles.' }));
    await screenshot(page, `keyboard-heading-${viewport.width}`);
    await page.keyboard.press('Tab');
    await ring(width(page));
    await page.keyboard.press('Tab');
    await ring(button(page, 'Turn ↻'));
    await page.keyboard.press('Tab');
    await ring(page.locator('[data-cell="0,0"]'));
    await page.keyboard.press('ArrowRight');
    await ring(page.locator('[data-cell="1,0"]'));
    await screenshot(page, `keyboard-tile-${viewport.width}`);
    // A pointer navigation after keyboard controls switches back to pointer focus.
    await button(page, 'Done for now').click();
    await pointerHeading('Let’s work it out.');
    await page.getByRole('button', { name: /Comet/ }).click();
    await pointerHeading('One number. Many rectangles.');

  });
}

test('navigation digits focus compact headings; keyboard selection and forced-color rings remain visible', async ({
  page,
  server,
}) => {
  await open(page, server.url, 'Sprout');
  await destination(page, 'How many?', 'focus-count-laptop');
  await expect(page.locator('.number-pad [aria-pressed="true"]')).toHaveCount(
    0,
  );
  await page.keyboard.press('Shift+Tab');
  await expect(button(page, 'Done for now')).toBeFocused();
  await page.keyboard.press('Enter');
  await destination(page, 'Let’s work it out.', 'focus-home');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: /Sprout/ })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: /Comet/ })).toBeFocused();
  await page.keyboard.press('Space');
  await destination(
    page,
    'One number. Many rectangles.',
    'focus-factor-laptop',
  );
  await page.keyboard.press('Tab');
  await ring(width(page));
  await page.keyboard.press('Tab');
  await ring(button(page, 'Turn ↻'));
  await page.keyboard.press('Shift+Tab');
  await ring(width(page));
  await button(page, 'Tray tile 18').focus();
  await page.keyboard.press('Space');
  await expect(button(page, 'Tray tile 18')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await ring(button(page, 'Tray tile 18'));
  await screenshot(page, 'focus-selected-tile');
  await page.locator('[data-cell="0,0"]').focus();
  await page.keyboard.press('ArrowRight');
  await ring(page.locator('[data-cell="1,0"]'));
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-cell="1,0"]')).toHaveText('18');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Escape');
  await expect(page.locator('.cell.selected')).toHaveCount(0);
  await saved(page);
  await button(page, 'Switch learner').click();
  await page.getByRole('button', { name: /Sprout/ }).click();
  await destination(page, 'How many?', 'focus-switched-count');
  await button(page, 'For grown-ups').click();
  await destination(
    page,
    'A little about this workshop',
    'focus-parent-laptop',
  );
  await expect(page.getByText(/Only Check adds an attempt/)).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await destination(
    page,
    'A little about this workshop',
    'focus-parent-narrow',
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await button(page, 'Home').click();
  await page.getByRole('button', { name: /Sprout/ }).click();
  await destination(page, 'How many?', 'focus-count-narrow');
  await button(page, 'Done for now').click();
  await page.getByRole('button', { name: /Comet/ }).click();
  await destination(
    page,
    'One number. Many rectangles.',
    'focus-factor-narrow',
  );
  await page.evaluate(() => {
    document.documentElement.style.zoom = '2';
  });
  await page.setViewportSize({ width: 1366, height: 900 });
  await width(page).focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await ring(width(page));
  await screenshot(page, 'focus-select-zoom');
  await page.evaluate(() => {
    document.documentElement.style.zoom = '1';
  });
  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  expect(
    await page.evaluate(
      () =>
        matchMedia('(forced-colors: active)').matches &&
        matchMedia('(prefers-reduced-motion: reduce)').matches,
    ),
  ).toBe(true);
  console.log(
    'forced-color-select',
    JSON.stringify(await ring(width(page), true)),
  );
  await screenshot(page, 'focus-forced-colors');
});

test('native width cancel and same width do not edit; exact 6–2–18–6 Undo and saved drafts stay separate from checks', async ({
  page,
  server,
}) => {
  await open(page, server.url);
  const initial = await current(page);
  await width(page).click();
  await page.keyboard.press('Escape');
  await ring(width(page));
  await screenshot(page, 'focus-select-after-escape');
  await width(page).selectOption({ value: '6' });
  await expect(button(page, 'Undo')).toBeDisabled();
  expect((await current(page)).version).toBe(initial.version);
  expect(await history(page)).toEqual([]);
  for (const tile of original.tiles) {
    await button(page, `Tray tile ${tile.id}`).click();
    await page.locator(`[data-cell="${tile.x},${tile.y}"]`).click();
  }
  await boardIs(page, original);
  await saved(page);
  await button(page, 'Check').click();
  await expect(page.locator('.feedback')).toContainText('13 tiles');
  const checked = await history(page);
  expect(checked).toHaveLength(1);
  expect(checked[0].result.outcome).toBe('unfinished');
  expect(checked[0].result.assistance).toBe(0);
  const before = await current(page);
  await width(page).click();
  await page.keyboard.press('Escape');
  await width(page).selectOption({ value: '6' });
  await boardIs(page, original);
  expect((await current(page)).version).toBe(before.version);
  expect(await history(page)).toEqual(checked);
  await width(page).selectOption({ value: '2' });
  await boardIs(page, narrow);
  await expect(page.locator('.resize-feedback')).toHaveText(
    '8 tiles returned to the tray. Undo restores the previous shape.',
  );
  await screenshot(page, 'resize-two-columns');
  await width(page).selectOption({ value: '18' });
  await boardIs(page, wide);
  await expect(page.locator('.resize-feedback')).toHaveText(
    '2 tiles returned to the tray. Undo restores the previous shape.',
  );
  await screenshot(page, 'resize-eighteen-columns');
  await width(page).selectOption({ value: '6' });
  await boardIs(page, returned);
  await expect(page.locator('.resize-feedback')).toHaveText(
    'No tiles returned to the tray. Undo restores the previous shape.',
  );
  for (const previous of [wide, narrow, original]) {
    await button(page, 'Undo').click();
    await boardIs(page, previous);
    await expect(page.locator('.resize-feedback')).toBeEmpty();
  }
  await button(page, 'Undo').click();
  await boardIs(page, { ...original, tiles: original.tiles.slice(0, -1) });
  await button(page, 'Tray tile 20').click();
  await page.locator('[data-cell="5,3"]').click();
  await boardIs(page, original);
  await page.locator('[data-cell="1,0"]').click();
  await page.locator('[data-cell="0,0"]').click();
  const edited = {
    ...original,
    tiles: original.tiles.map((t) => (t.id === 18 ? { ...t, x: 0 } : t)),
  };
  await boardIs(page, edited);
  await saved(page);
  await button(page, 'Help').click();
  await expect(page.getByText('Hint seen', { exact: true })).toBeVisible();
  expect(await history(page)).toEqual(checked);
  await button(page, 'Done for now').click();
  await page.getByRole('button', { name: /Comet/ }).click();
  await boardIs(page, edited);
  await expect(button(page, 'Undo')).toBeDisabled();
  await page.reload();
  await page.getByRole('button', { name: /Comet/ }).click();
  await boardIs(page, edited);
  expect(await history(page)).toEqual(checked);
  expect(sorted((await current(page)).draft.factor!.tiles)).toEqual(
    sorted(edited.tiles),
  );
  await button(page, 'Check').click();
  await expect(page.locator('.feedback')).toContainText('13 tiles');
  const later = await history(page);
  expect(later).toHaveLength(2);
  expect(
    later.find((a) => a.result.submissionId === checked[0].result.submissionId),
  ).toEqual(checked[0]);
  const assisted = later.find(
    (a) => a.result.submissionId !== checked[0].result.submissionId,
  )!;
  expect(assisted.result.assistance).toBe(1);
  expect(sorted(assisted.submission!.factor!.tiles)).toEqual(
    sorted(edited.tiles),
  );
  await button(page, 'For grown-ups').click();
  await expect(page.locator('.history li')).toHaveCount(2);
  await screenshot(page, 'saved-work-and-attempts');
});

test('resize feedback is singular, clears on later edits/turns, and native numeric selection works', async ({
  page,
  server,
}) => {
  await open(page, server.url);
  await button(page, 'Tray tile 8').click();
  await page.locator('[data-cell="5,0"]').click();
  await width(page).focus();
  await page.keyboard.press('9');
  await page.keyboard.press('Enter');
  await expect(width(page)).toHaveValue('9');
  await width(page).selectOption({ value: '2' });
  await expect(page.locator('.resize-feedback')).toHaveText(
    '1 tile returned to the tray. Undo restores the previous shape.',
  );
  await button(page, 'Tray tile 8').click();
  await page.locator('[data-cell="1,0"]').click();
  await expect(page.locator('.resize-feedback')).toBeEmpty();
  await width(page).selectOption({ value: '18' });
  await expect(page.locator('.resize-feedback')).toContainText(
    'No tiles returned',
  );
  await button(page, 'Turn ↻').click();
  await expect(page.locator('.resize-feedback')).toBeEmpty();
  await expect(page.locator('[data-cell="0,1"]')).toHaveText('8');
  await button(page, 'Undo').click();
  await expect(page.locator('[data-cell="1,0"]')).toHaveText('8');
  await expect(page.locator('.resize-feedback')).toBeEmpty();
});

test('Undo retains the most recent 50 board changes and leaves assistance and attempts intact', async ({
  page,
  server,
}) => {
  await open(page, server.url);
  await button(page, 'Help').click();
  await button(page, 'Check').click();
  await expect(page.locator('.feedback')).toContainText('24 tiles');
  const checked = await history(page);
  for (let i = 0; i < 51; i++)
    await width(page).selectOption({ value: i % 2 === 0 ? '2' : '6' });
  for (let i = 0; i < 50; i++) await button(page, 'Undo').click();
  await expect(width(page)).toHaveValue('2');
  await expect(button(page, 'Undo')).toBeDisabled();
  await expect(page.getByText('Hint seen', { exact: true })).toBeVisible();
  expect(await history(page)).toEqual(checked);
});

test('delayed navigation and failed saves do not steal focus after the user moves it', async ({
  page,
  server,
}) => {
  let release!: () => void, arrived!: () => void, delivered!: () => void;
  let gate = new Promise<void>((r) => {
    release = r;
  });
  let arrival = new Promise<void>((r) => {
    arrived = r;
  });
  let delivery = new Promise<void>((r) => {
    delivered = r;
  });
  await page.route('**/learners/sprout/sessions', async (route) => {
    const response = await route.fetch();
    arrived();
    await gate;
    await route.fulfill({ response });
    delivered();
  });
  await page.getByRole('button', { name: /Sprout/ }).click();
  await arrival;
  const brand = page.getByRole('link', { name: 'Math Workshop home' });
  await brand.focus();
  release();
  await delivery;
  await expect(button(page, 'Done for now')).toBeVisible();
  await expect(brand).toBeFocused();
  await page.unroute('**/learners/sprout/sessions');
  gate = new Promise<void>((r) => {
    release = r;
  });
  arrival = new Promise<void>((r) => {
    arrived = r;
  });
  delivery = new Promise<void>((r) => {
    delivered = r;
  });
  await page.route('**/draft', async (route) => {
    arrived();
    await gate;
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: '{"error":"synthetic storage failure"}',
    });
    delivered();
  });
  await button(page, 'Answer 3').click();
  await arrival;
  await button(page, 'Done for now').click();
  await button(page, 'Answer 2').focus();
  release();
  await delivery;
  await expect(button(page, 'Stay here')).toBeVisible();
  await expect(button(page, 'Answer 2')).toBeFocused();
  await button(page, 'Stay here').click();
  await expect(button(page, 'Done for now')).toBeFocused();
  await page.unroute('**/draft');
});
