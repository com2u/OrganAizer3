import { test, expect, type Page } from '@playwright/test'
import { login } from './helpers'

let sharedPage: Page

test.describe.configure({ mode: 'serial' })

test.describe('OCR URL Test', () => {
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(60_000)
    sharedPage = await browser.newPage()
    await login(sharedPage)
  })

  test.afterAll(async () => {
    await sharedPage.close()
  })

  test.beforeEach(async () => {
    await sharedPage.goto('/')
    await sharedPage.locator('nav').waitFor({ state: 'visible', timeout: 10_000 })
    await sharedPage.locator('nav button[title*="Aufgaben"]').first().click()
    await sharedPage.getByRole('button', { name: /OCR.*Texterkennung/ }).click()
  })

  test('URL tab is visible', async () => {
    await expect(sharedPage.locator('.sprache-tabs .tab-btn', { hasText: 'URL' })).toBeVisible({ timeout: 5_000 })
  })

  test('URL input appears when clicking URL tab', async () => {
    await sharedPage.locator('.sprache-tabs .tab-btn', { hasText: 'URL' }).click()
    await expect(sharedPage.locator('input[type="url"]')).toBeVisible({ timeout: 5_000 })
  })

  test('extract button disabled without URL', async () => {
    await sharedPage.locator('.sprache-tabs .tab-btn', { hasText: 'URL' }).click()
    const extractBtn = sharedPage.getByRole('button', { name: /Text extrahieren/ })
    await expect(extractBtn).toBeDisabled()
  })

  test('extract button enabled with URL', async () => {
    await sharedPage.locator('.sprache-tabs .tab-btn', { hasText: 'URL' }).click()
    await sharedPage.locator('input[type="url"]').fill('https://www.arte-magazin.de/media/2021/10/Web_070_Titelbilder_1440x660px_3.jpg')
    const extractBtn = sharedPage.getByRole('button', { name: /Text extrahieren/ })
    await expect(extractBtn).toBeEnabled()
  })

  test('clipboard tab shows paste hint', async () => {
    await sharedPage.locator('.sprache-tabs .tab-btn', { hasText: 'Zwischenablage' }).click()
    await expect(sharedPage.locator('.field-hint')).toBeVisible({ timeout: 5_000 })
  })

  test('file tab shows file input', async () => {
    await sharedPage.locator('.sprache-tabs .tab-btn', { hasText: 'Datei' }).click()
    await expect(sharedPage.locator('input[type="file"]')).toBeVisible({ timeout: 5_000 })
  })

  test('error message shown instead of alert popup', async () => {
    await sharedPage.locator('.sprache-tabs .tab-btn', { hasText: 'URL' }).click()
    await sharedPage.locator('input[type="url"]').fill('https://example.com/not-an-image')
    await sharedPage.getByRole('button', { name: /Text extrahieren/ }).click()
    // Should show error message inline (not alert popup)
    await expect(sharedPage.locator('.error-msg')).toBeVisible({ timeout: 30_000 })
  })
})
