import { test, expect, Page } from '@playwright/test'
import { login } from './helpers'

let sharedPage: Page

test.describe('Sprache - Text vorlesen (TTS)', () => {
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
  })

  test('TTS section is displayed by default', async () => {
    await expect(sharedPage.getByRole('heading', { name: /Text vorlesen/i })).toBeVisible()
  })

  test('text input area exists', async () => {
    await expect(sharedPage.locator('textarea').first()).toBeVisible()
  })

  test('voice selector exists with options', async () => {
    await expect(sharedPage.getByText('Stimme')).toBeVisible()
    const voiceSelect = sharedPage.locator('select').filter({ hasText: /Anna|Killian|Jenny|Sonia/ })
    await expect(voiceSelect).toBeVisible()
    const options = voiceSelect.locator('option')
    await expect(options.nth(0)).toContainText('Anna')
    await expect(options.nth(1)).toContainText('Killian')
  })

  test('speed selector exists with options', async () => {
    await expect(sharedPage.getByText('Geschwindigkeit')).toBeVisible()
    const speedSelect = sharedPage.locator('select').filter({ hasText: /langsam|normal|schnell/ })
    await expect(speedSelect).toBeVisible()
  })

  test('generate button is disabled without text', async () => {
    const generateBtn = sharedPage.locator('.primary-btn')
    await expect(generateBtn).toBeDisabled()
  })

  test('generate button enables with text', async () => {
    const textarea = sharedPage.locator('textarea').first()
    await textarea.fill('Hallo Welt, dies ist ein Test.')
    const generateBtn = sharedPage.locator('.primary-btn')
    await expect(generateBtn).toBeEnabled()
  })

  test('text input accepts long text', async () => {
    const textarea = sharedPage.locator('textarea').first()
    const longText = 'Dies ist ein längerer Text. '.repeat(20)
    await textarea.fill(longText)
    await expect(textarea).toHaveValue(longText)
  })
})
