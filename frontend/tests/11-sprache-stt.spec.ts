import { test, expect, Page } from '@playwright/test'
import { login } from './helpers'

let sharedPage: Page

test.describe('Sprache - Sprache zu Text (STT)', () => {
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
    // Click on "Sprache zu Text" tab
    await sharedPage.locator('.sprache-tabs .tab-btn', { hasText: 'Sprache zu Text' }).click()
  })

  test('STT section is displayed', async () => {
    await expect(sharedPage.getByRole('heading', { name: /Sprache zu Text/i })).toBeVisible()
  })

  test('audio file upload exists', async () => {
    await expect(sharedPage.locator('input[type="file"]')).toBeVisible()
    const fileInput = sharedPage.locator('input[type="file"]')
    await expect(fileInput).toBeVisible()
  })

  test('transcribe button exists', async () => {
    await expect(sharedPage.getByRole('button', { name: /Transkribieren/i })).toBeVisible()
  })

  test('transcribe button disabled without file', async () => {
    const transcribeBtn = sharedPage.getByRole('button', { name: /Transkribieren/i })
    await expect(transcribeBtn).toBeDisabled()
  })

  test('file input accepts audio types', async () => {
    const fileInput = sharedPage.locator('input[type="file"]')
    const accept = await fileInput.getAttribute('accept')
    expect(accept).toContain('audio')
  })
})
