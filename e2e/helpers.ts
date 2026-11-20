import {expect, type Page, type TestInfo} from '@playwright/test';
import fs from 'node:fs';

/** Demo project fixture already used by the facade/workspace evidence scripts. */
export const fixture = JSON.parse(fs.readFileSync('docs/screenshots/facade/demo-project.json', 'utf8'));

/** Seed the browser-only demo API: signed in, one saved project, opened last. */
export async function seed(page: Page, project = fixture) {
  await page.addInitScript(v => {
    if (sessionStorage.getItem('e2e-seeded')) return;
    localStorage.setItem('hcs_demo_logged', 'true');
    localStorage.setItem('hcs_demo_projects', JSON.stringify([v]));
    localStorage.setItem('hcs_last_project', v.id);
    sessionStorage.setItem('e2e-seeded', '1');
  }, project);
}

/** Collect uncaught page errors; call assertClean at the end of a test. */
export function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  return {errors, assertClean: () => expect(errors, errors.join('\n')).toEqual([])};
}

export const isPhone = (info: TestInfo) => info.project.name === 'phone';

/** Switch workspace mode with the segmented buttons, or the compact select on phones. */
export async function openMode(page: Page, label: 'Brief' | '2D' | '3D' | 'Present' | 'Proposal') {
  // Wait for the workspace header before choosing between the desktop buttons and the phone select.
  await expect(page.getByLabel('Project title')).toBeVisible();
  const buttons = page.getByRole('navigation', {name: 'Workspace mode'});
  if (await buttons.isVisible()) await buttons.getByRole('button', {name: label, exact: true}).click();
  else await chooseOption(page, 'Workspace mode', new RegExp(`^${label}$`));
}

/** Drive the design-system Select (role=combobox + listbox) the way a user does. */
export async function chooseOption(page: Page, label: string, option: RegExp) {
  await page.getByRole('combobox', {name: label}).first().click();
  await page.getByRole('option', {name: option}).first().click();
}

export async function waitFor3D(page: Page) {
  await expect(page.locator('canvas').first()).toBeVisible();
  await expect(page.locator('.viewer-loading')).toBeHidden();
}

export async function noHorizontalOverflow(page: Page) {
  const {scroll, width} = await page.evaluate(() => ({scroll: document.documentElement.scrollWidth, width: innerWidth}));
  expect(scroll, 'page must not scroll sideways').toBeLessThanOrEqual(width + 1);
}
