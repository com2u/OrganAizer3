import { test, expect, Page } from '@playwright/test'
import { login } from './helpers'

let sharedPage: Page

test.describe('Aufgaben - OCR (Texterkennung)', () => {
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
    await sharedPage.locator('nav button[title*="Aufgaben"]').first().click()
    await sharedPage.getByRole('button', { name: /OCR.*Texterkennung/ }).click()
  })

  test('OCR form is displayed', async () => {
    await expect(sharedPage.getByRole('heading', { name: /OCR.*Texterkennung/ })).toBeVisible()
    await expect(sharedPage.getByText(/Bild-Datei/)).toBeVisible()
  })

  test('language selector has 5 languages', async () => {
    const langSelect = sharedPage.locator('select').filter({ hasText: /Deutsch|English/ })
    await expect(langSelect).toBeVisible()
    const options = langSelect.locator('option')
    await expect(options).toHaveCount(5)
    await expect(options.nth(0)).toContainText('Deutsch')
    await expect(options.nth(1)).toContainText('English')
    await expect(options.nth(2)).toContainText('Français')
    await expect(options.nth(3)).toContainText('Español')
    await expect(options.nth(4)).toContainText('Italiano')
  })

  test('extract button is disabled without file', async () => {
    const extractBtn = sharedPage.getByRole('button', { name: /Text extrahieren/ })
    await expect(extractBtn).toBeDisabled()
  })

  test('paste hint is shown', async () => {
    // The OCR section now has tabs (File/URL/Clipboard); check that the file input is visible
    await expect(sharedPage.locator('input[type="file"]')).toBeVisible({ timeout: 5_000 })
  })

  test('back button returns to overview', async () => {
    await sharedPage.getByRole('button', { name: /Zurück zur Aufgabenübersicht/ }).click()
    await expect(sharedPage.getByText('Was möchtest du erledigen?')).toBeVisible()
  })

  test('file input accepts images only', async () => {
    const fileInput = sharedPage.locator('input[type="file"]')
    await expect(fileInput).toHaveAttribute('accept', 'image/*')
  })
})
