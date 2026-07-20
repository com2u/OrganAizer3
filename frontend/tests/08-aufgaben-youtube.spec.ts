import { test, expect, Page } from '@playwright/test'
import { login } from './helpers'

let sharedPage: Page

test.describe('Aufgaben - YouTube Download', () => {
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
    await sharedPage.getByRole('button', { name: /YouTube Download/ }).click()
  })

  test('YouTube form is displayed', async () => {
    await expect(sharedPage.getByRole('heading', { name: 'YouTube Download' })).toBeVisible()
    await expect(sharedPage.locator('input[type="url"]')).toBeVisible()
  })

  test('format selector has Audio and Video options', async () => {
    const formatSelect = sharedPage.locator('select').filter({ hasText: /Audio|Video/ })
    await expect(formatSelect).toBeVisible()
    const options = formatSelect.locator('option')
    await expect(options.nth(0)).toContainText('Audio')
    await expect(options.nth(1)).toContainText('Video')
  })

  test('download button is disabled without URL', async () => {
    const downloadBtn = sharedPage.getByRole('button', { name: /Herunterladen/ })
    await expect(downloadBtn).toBeDisabled()
  })

  test('download button is enabled with valid URL', async () => {
    await sharedPage.locator('input[type="url"]').fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    const downloadBtn = sharedPage.getByRole('button', { name: /Herunterladen/ })
    await expect(downloadBtn).toBeEnabled()
  })

  test('URL input has placeholder', async () => {
    const urlInput = sharedPage.locator('input[type="url"]')
    await expect(urlInput).toHaveAttribute('placeholder', /youtube\.com/)
  })

  test('back button returns to overview', async () => {
    await sharedPage.getByRole('button', { name: /Zurück zur Aufgabenübersicht/ }).click()
    await expect(sharedPage.getByText('Was möchtest du erledigen?')).toBeVisible()
  })
})
