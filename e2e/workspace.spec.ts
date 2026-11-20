import {expect, test} from '@playwright/test';
import {chooseOption, isPhone, noHorizontalOverflow, openMode, seed, waitFor3D, watchErrors} from './helpers';

test('signs in with the demo admin account', async ({page}) => {
  const watch = watchErrors(page);
  await page.goto('/');
  await page.getByLabel('Email address').fill('admin@demo.local');
  await page.getByLabel('Password').fill('DemoPassword123!');
  await page.getByRole('button', {name: /sign in/i}).click();
  await expect(page.getByRole('heading', {level: 1, name: /^Good (morning|afternoon|evening)/})).toBeVisible();
  await expect(page.getByRole('button', {name: 'Sign out'})).toBeAttached();
  await noHorizontalOverflow(page);
  watch.assertClean();
});

test('rejects a wrong password', async ({page}) => {
  await page.goto('/');
  await page.getByLabel('Email address').fill('admin@demo.local');
  await page.getByLabel('Password').fill('wrong-password-123');
  await page.getByRole('button', {name: /sign in/i}).click();
  await expect(page.getByText(/incorrect/i)).toBeVisible();
});

test('opens the saved project in every workspace mode', async ({page}) => {
  const watch = watchErrors(page);
  await seed(page);
  await page.goto('/');
  await openMode(page, 'Brief');
  await expect(page.getByLabel('Project title')).toBeVisible();
  await openMode(page, '2D');
  await expect(page.locator('.compass-heading').first()).toBeVisible();
  await openMode(page, 'Proposal');
  await noHorizontalOverflow(page);
  watch.assertClean();
});

test('3D house renders, front view works and the compass turns with the camera', async ({page}) => {
  const watch = watchErrors(page);
  await seed(page);
  await page.goto('/');
  await openMode(page, '3D');
  await waitFor3D(page);
  const ring = page.locator('.compass-ring').first();
  await expect(ring).toBeAttached();
  const before = await ring.getAttribute('transform');
  const box = (await page.locator('canvas').first().boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 260, box.y + box.height / 2, {steps: 12});
  await page.mouse.up();
  await expect.poll(() => ring.getAttribute('transform')).not.toBe(before);
  await page.getByRole('button', {name: 'Front view'}).first().click();
  await noHorizontalOverflow(page);
  watch.assertClean();
});

test('jumps inside a room and shows the walking compass', async ({page}) => {
  const watch = watchErrors(page);
  await seed(page);
  await page.goto('/');
  await openMode(page, '3D');
  await waitFor3D(page);
  await chooseOption(page, 'Look inside a room', /living/i);
  await expect(page.locator('.compass-heading').first()).toContainText(/Facing (N|NE|E|SE|S|SW|W|NW)\b/);
  watch.assertClean();
});

test('Present mode hides the editing panels and can be exited', async ({page}, info) => {
  const watch = watchErrors(page);
  await seed(page);
  await page.goto('/');
  await openMode(page, 'Present');
  await waitFor3D(page);
  if (!isPhone(info)) await expect(page.getByLabel('Inspector', {exact: true})).toBeHidden();
  await page.getByRole('button', {name: /exit presentation/i}).click();
  await expect(page.getByRole('button', {name: /exit presentation/i})).toBeHidden();
  watch.assertClean();
});

test('command palette opens with Ctrl+K and the theme switches', async ({page}) => {
  const watch = watchErrors(page);
  await seed(page);
  await page.goto('/');
  await expect(page.getByLabel('Project title')).toBeVisible();
  await page.keyboard.press('Control+K');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  const toggle = page.getByRole('button', {name: /switch to (dark|light) theme/i}).first();
  const label = await toggle.getAttribute('aria-label');
  await toggle.click();
  await expect(page.getByRole('button', {name: /switch to (dark|light) theme/i}).first()).not.toHaveAttribute('aria-label', label!);
  watch.assertClean();
});
