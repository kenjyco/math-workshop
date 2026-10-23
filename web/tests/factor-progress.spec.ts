import { test, open, rows, saved, screenshot } from './fixtures.ts';
import { expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Independent known pairs, including a square and a single-pair total.
const cases: Record<number, number[]> = {
  24: [6, 8, 12, 24],
  16: [4, 8, 16],
  7: [7],
  1: [1],
};
const total = Number(process.env.WORKSHOP_FACTOR_FIXTURE || 24);
for (const width of [1366, 390]) {
  test(`acknowledged factor progress lifecycle for ${total} at ${width}`, async ({
    page,
    server,
  }) => {
    test.skip(
      !cases[total],
      'This configured total has its own contract scenario.',
    );
    await page.setViewportSize({ width, height: 900 });
    await open(page, server.url);
    const panel = page.locator('.discoveries');
    const status = panel.getByRole('status');
    const button = (name: string) =>
      page.getByRole('button', { name, exact: true });
    const history = async () =>
      (await page.request.get(server.url + '/api/history')).json();
    const pairs = cases[total];
    const zero =
      pairs.length === 1
        ? `There is 1 factor pair to find for ${total}.`
        : `There are ${pairs.length} factor pairs to find for ${total}.`;
    const complete =
      pairs.length === 1
        ? `You found the factor pair for ${total}!`
        : `All ${pairs.length} factor pairs found for ${total}!`;
    await expect(status).toHaveText(zero);
    await expect(panel.locator('.pair-list span')).toHaveCount(0);
    await expect(panel).toContainText(
      'Turning a rectangle counts as the same pair.',
    );
    expect(await history()).toHaveLength(0);
    await screenshot(page, `factor-${total}-zero-${width}`);
    for (let i = 0; i < pairs.length; i++) {
      await button('Reset board').click();
      await page
        .getByLabel('Tiles per row', { exact: true })
        .selectOption(String(pairs[i]));
      await rows(page, total / pairs[i], total);
      const before =
        i === 0
          ? zero
          : `${i} of ${pairs.length} found · ${pairs.length - i} more to find.`;
      const after =
        i + 1 === pairs.length
          ? complete
          : `${i + 1} of ${pairs.length} found · ${pairs.length - i - 1} more to find.`;
      await expect(status).toHaveText(before); // Filling is not discovering.
      if (i + 1 === pairs.length) {
        // Server accepted, but the response is lost: no optimistic completion.
        await page.route('**/attempts', async (route) => {
          await route.fetch();
          await route.abort('failed');
        });
        await button('Check').click();
        await expect(page.locator('.error-box')).toContainText(
          'Could not confirm the earlier submission',
        );
        await expect(status).toHaveText(before);
        await expect(panel.locator('.pair-list span')).toHaveCount(i);
        await page.unroute('**/attempts');
      }
      await button('Check').click();
      await expect(status).toHaveText(after);
      await expect(panel.locator('.pair-list span')).toHaveCount(i + 1);
      // Retry above and duplicate/turned Checks preserve unique progress.
      await button('Check').click();
      await expect(status).toHaveText(after);
      await button('Turn ↻').click();
      await button('Check').click();
      await expect(status).toHaveText(after);
      await expect(panel.locator('.pair-list span')).toHaveCount(i + 1);
      if (i === 0 || i === pairs.length - 2)
        await screenshot(page, `factor-${total}-found-${i + 1}-${width}`);
    }
    await expect(panel).toContainText(
      'You can keep exploring or choose Done for now.',
    );
    await screenshot(page, `factor-${total}-complete-${width}`);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    // Observe the live region: unrelated board operations must not reannounce it.
    await status.evaluate((el) => {
      (window as any).progressChanges = 0;
      new MutationObserver(() => (window as any).progressChanges++).observe(
        el,
        { subtree: true, childList: true, characterData: true },
      );
    });
    for (const name of ['Reset board', 'Undo', 'Turn ↻']) {
      await button(name).click();
      await expect(status).toHaveText(complete);
    }
    await page.getByLabel('Tiles per row', { exact: true }).selectOption('1');
    await expect(status).toHaveText(complete);
    expect(await page.evaluate(() => (window as any).progressChanges)).toBe(0);
    await saved(page);
    const attempts = await history();
    await button('Done for now').click();
    await page.getByRole('button', { name: /Comet/ }).click();
    await expect(status).toHaveText(complete);
    await page.reload();
    await page.getByRole('button', { name: /Comet/ }).click();
    await expect(status).toHaveText(complete);
    expect(await history()).toEqual(attempts);
    await button(`New practice (${total} tiles)`).click();
    await expect(status).toHaveText(zero);
    await expect(panel.locator('.pair-list span')).toHaveCount(0);
    expect(await history()).toEqual(attempts);
  });
}
