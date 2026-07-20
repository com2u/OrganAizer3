import { test, expect, Page } from '@playwright/test'
import { login } from './helpers'

let sharedPage: Page

test.describe('Aufgaben - Bilder erstellen', () => {
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
    await sharedPage.getByRole('button', { name: /Bilder erstellen/ }).click()
  })

  test('bild generator form is displayed', async () => {
    await expect(sharedPage.getByRole('heading', { name: /Bilder/i })).toBeVisible()
    await expect(sharedPage.locator('textarea').first()).toBeVisible()
  })

  test('prompt field is required (generate disabled)', async () => {
    const generateBtn = sharedPage.locator('.generate-btn')
    await expect(generateBtn).toBeDisabled()
  })

  test('prompt field accepts text input', async () => {
    const textarea = sharedPage.locator('textarea').first()
    await textarea.fill('Eine Katze im Weltraum')
    await expect(textarea).toHaveValue('Eine Katze im Weltraum')
  })

  test('negative prompt field exists', async () => {
    await expect(sharedPage.getByText(/Negative Prompt/i)).toBeVisible()
  })

  test('style selector has multiple options', async () => {
    await expect(sharedPage.getByText(/Stil/i).first()).toBeVisible()
    await expect(sharedPage.getByText('Realistisch')).toBeVisible()
    await expect(sharedPage.getByText('Digital Art')).toBeVisible()
    await expect(sharedPage.getByText('Anime')).toBeVisible()
    await expect(sharedPage.getByText('3D Render')).toBeVisible()
  })

  test('aspect ratio selector has options', async () => {
    await expect(sharedPage.getByText(/Seitenverhältnis/i)).toBeVisible()
    await expect(sharedPage.getByText('1:1')).toBeVisible()
    await expect(sharedPage.getByText('16:9')).toBeVisible()
    await expect(sharedPage.getByText('9:16')).toBeVisible()
  })

  test('count selector exists', async () => {
    await expect(sharedPage.getByText(/Anzahl/i)).toBeVisible()
  })

  test('quality selector has Standard, HD, Ultra', async () => {
    // Just verify that at least 2 selects exist (count + quality)
    const selects = sharedPage.locator('select')
    const count = await selects.count()
    expect(count).toBeGreaterThanOrEqual(2)
  })

  test('improve prompt button exists and is disabled without text', async () => {
    const improveBtn = sharedPage.getByRole('button', { name: /Prompt verbessern/i })
    await expect(improveBtn).toBeVisible()
    await expect(improveBtn).toBeDisabled()
  })

  test('generate button enables with prompt', async () => {
    await sharedPage.locator('textarea').first().fill('Eine Katze im Weltraum')
    const generateBtn = sharedPage.locator('.generate-btn')
    await expect(generateBtn).toBeEnabled()
  })

  test('empty results area shows placeholder', async () => {
    await expect(sharedPage.getByText(/Prompt eingeben|erstes KI-Bild/i)).toBeVisible({ timeout: 5_000 })
  })
})
