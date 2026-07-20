import { test, expect, type Page } from '@playwright/test'
import { login } from './helpers'

let sharedPage: Page

test.describe.configure({ mode: 'serial' })

test.describe('Bilder Generate - Full Pipeline', () => {
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(120_000)
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
    await sharedPage.getByRole('button', { name: /Bilder erstellen/ }).click()
  })

  test('form is displayed', async () => {
    await expect(sharedPage.getByRole('heading', { name: /Bilder/i })).toBeVisible({ timeout: 5_000 })
    await expect(sharedPage.locator('textarea').first()).toBeVisible()
  })

  test('generate image and verify result', async () => {
    const textarea = sharedPage.locator('textarea').first()
    await textarea.fill('Ein Fuchs im Wald')

    // Click generate
    const generateBtn = sharedPage.locator('.generate-btn')
    await generateBtn.click()

    // Wait for results — Pollinations.ai can take 10-30s
    // Look for img tags in the results panel
    const resultImg = sharedPage.locator('.results-grid img, .result-image-card img').first()
    await expect(resultImg).toBeVisible({ timeout: 60_000 })

    // Verify the image has a non-empty src
    const src = await resultImg.getAttribute('src')
    expect(src).toBeTruthy()
    expect(src!.length).toBeGreaterThan(20)

    // Verify download link exists
    const downloadLink = sharedPage.locator('.result-image-card a[download]').first()
    await expect(downloadLink).toBeVisible()
  })
})
