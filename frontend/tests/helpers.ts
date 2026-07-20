import { Page, expect } from '@playwright/test'

/**
 * Shared test helpers for OrganAIzer Playwright tests.
 */

const TEST_USER = {
  email: 'paddy22@gmx.de',
  password: 'PPH2com2u',
}

/**
 * Navigate to the landing page (unauthenticated).
 */
export async function gotoLanding(page: Page) {
  await page.goto('/')
  await expect(page.locator('h1')).toBeVisible({ timeout: 8_000 })
}

/**
 * Perform a full login flow: landing → login form → authenticated app.
 * Returns after the sidebar is visible.
 *
 * Optimised: no reload, minimal waits, short timeouts.
 * Login typically completes in 1-3 seconds.
 */
export async function login(page: Page) {
  // Go to landing and clear stale token
  await page.goto('/')
  await page.evaluate(() => localStorage.removeItem('organaizer_token'))

  // Wait for landing page, click Anmelden
  await expect(page.locator('h1')).toBeVisible({ timeout: 5_000 })
  await page.getByRole('button', { name: 'Anmelden' }).first().click()

  // Fill login form and submit
  await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 5_000 })
  await page.locator('input[type="email"]').fill(TEST_USER.email)
  await page.locator('input[type="password"]').fill(TEST_USER.password)
  await page.getByRole('button', { name: 'Anmelden' }).click()

  // Wait for sidebar to appear (login + API verification)
  // Normally ~1-2s, allow 10s for slow network
  await expect(page.locator('nav')).toBeVisible({ timeout: 10_000 })
  await expect(page.locator('nav').getByText('OrganAIzer')).toBeVisible({ timeout: 5_000 })
}

/**
 * Navigate to a specific sidebar section by clicking its button.
 * Uses title attribute for disambiguation.
 */
export async function gotoSection(page: Page, sectionName: string) {
  const btn = page.locator(`nav button[title*="${sectionName}"]`).first()
  if (await btn.isVisible({ timeout: 3_000 })) {
    await btn.click()
    return
  }
  await page.locator('nav').getByRole('button', { name: sectionName }).first().click()
}

/**
 * Get the currently active theme from the <html> data-theme attribute.
 */
export async function getTheme(page: Page): Promise<string> {
  return page.evaluate(() => document.documentElement.getAttribute('data-theme') || '')
}

/**
 * Get the current language from localStorage.
 */
export async function getLang(page: Page): Promise<string> {
  return page.evaluate(() => localStorage.getItem('organaizer_lang') || 'de')
}
