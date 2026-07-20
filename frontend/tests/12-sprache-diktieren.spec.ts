import { test, expect, Page } from '@playwright/test'
import { login } from './helpers'

let sharedPage: Page

test.describe('Sprache - Diktieren', () => {
  test.describe.configure({ mode: 'serial' })
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(60_000)
    sharedPage = await browser.newPage()
    await login(sharedPage)
  })

  test.afterAll(async () => {
    await sharedPage.close()
  })

  test.beforeEach(async () => {
    // Navigate to home to reset state
    await sharedPage.goto('/')
    await sharedPage.locator('nav').waitFor({ state: 'visible', timeout: 10_000 })
    await sharedPage.locator('nav button[title*="Sprache"]').first().click()
    // Click on "Diktieren" tab
    await sharedPage.locator('.sprache-tabs .tab-btn', { hasText: 'Diktieren' }).click()
  })

  test('dictation section is displayed', async () => {
    await expect(sharedPage.getByRole('heading', { name: /Diktieren/i })).toBeVisible()
  })

  test('language selector exists with options', async () => {
    await expect(sharedPage.getByText('Sprache').first()).toBeVisible()
    const langSelect = sharedPage.locator('select').filter({ hasText: /Deutsch|English|Français|Español/ })
    await expect(langSelect).toBeVisible()
    const options = langSelect.locator('option')
    await expect(options.nth(0)).toContainText('Deutsch')
    await expect(options.nth(1)).toContainText('English')
  })

  test('start recording button exists', async () => {
    await expect(sharedPage.getByRole('button', { name: /Aufnahme starten/i })).toBeVisible()
  })

  test('dictation section has description', async () => {
    await expect(sharedPage.locator('.tts-wrapper')).toBeVisible()
  })

  test('result area container exists', async () => {
    // The tts-wrapper container should be visible for the dictation tab
    await expect(sharedPage.locator('.tts-wrapper')).toBeVisible()
  })

  test('language has 4 options (de/en/fr/es)', async () => {
    const langSelect = sharedPage.locator('select').filter({ hasText: /Deutsch|English|Français|Español/ })
    const options = langSelect.locator('option')
    await expect(options).toHaveCount(4)
  })
})
