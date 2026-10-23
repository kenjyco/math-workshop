import { test, open, saved, screenshot } from './fixtures.ts';
import { expect } from '@playwright/test';
// Optional real-binary supplement. Ordinary baseline migration fixtures are Go source.
test.use({ legacy: true });
test.skip(
  !process.env.WORKSHOP_PREVIOUS_BINARY,
  'Optional previous-executable compatibility check',
);
test('prior executable count resumes its original pad, draft and identity; Next uses current rules', async ({
  page,
  server,
}) => {
  await open(page, server.url, 'Sprout');
  await expect(page.locator('.number-pad button')).toHaveCount(6);
  await expect(page.locator('.counter.counted')).toHaveCount(2);
  await expect(
    page.getByRole('button', { name: 'Answer 3', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(
    page.getByRole('button', { name: 'Apart', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.assist-note')).toContainText('Help used');
  await expect(page.locator('.save-line')).toContainText('totals through 5');
  const prior = await (
    await page.request.post(server.url + '/api/learners/sprout/sessions', {
      headers: { 'X-Workshop-Request': '1' },
      data: { new: false },
    })
  ).json();
  expect(prior.validator).toBe('math-v1');
  expect(prior.lessonRevision).toBe(1);
  expect(prior.version).toBe(1);
  await page.getByRole('button', { name: 'Done for now', exact: true }).click();
  await open(page, server.url, 'Sprout');
  await expect(page.locator('.number-pad button')).toHaveCount(6);
  await page.getByRole('button', { name: 'Check', exact: true }).click();
  await expect(page.locator('.feedback')).toContainText('2 + 1 = 3');
  await saved(page);
  await screenshot(page, 'legacy-count-pad');
  await page.getByRole('button', { name: 'Next →', exact: true }).click();
  await expect(page.locator('.number-pad button')).toHaveCount(11);
  const fresh = await (
    await page.request.post(server.url + '/api/learners/sprout/sessions', {
      headers: { 'X-Workshop-Request': '1' },
      data: { new: false },
    })
  ).json();
  expect(fresh.id).not.toBe(prior.id);
  expect(fresh.validator).toBe('math-v2');
  expect(fresh.lessonRevision).toBe(2);
  await page
    .getByRole('button', { name: 'For grown-ups', exact: true })
    .click();
  await expect(page.locator('.history li')).toHaveCount(2);
  await expect(page.locator('.history')).toContainText('2 + 1 = ? · Chose 3');
});
