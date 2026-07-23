import { test, expect, type Page } from '@playwright/test'
import { login } from './helpers'

let page: Page

test.describe('Sprache - Live Dialog', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(60_000)
    const context = await browser.newContext({ permissions: ['microphone'] })
    page = await context.newPage()
    await login(page)
  })

  test.afterAll(async () => {
    await page.context().close()
  })

  test('connects securely to LiveKit and can end the dialog', async () => {
    await page.locator('nav button[title*="Sprache"]').first().click()
    await page.locator('.sprache-tabs .tab-btn', { hasText: 'Dialog' }).click()

    await expect(page.getByRole('heading', { name: 'Sprachdialog mit dem Assistenten' })).toBeVisible()
    await expect(page.getByText(/Mikrofonzugriff/)).toBeVisible()

    await page.getByRole('button', { name: 'Gespräch starten' }).click()
    await expect(page.getByText('Verbunden', { exact: true })).toBeVisible({ timeout: 25_000 })
    await expect(page.getByRole('button', { name: 'Gespräch beenden' })).toBeVisible()
    await expect(page.locator('.dialog-log')).toContainText(
      'Assistent-Audio verbunden.',
      { timeout: 30_000 },
    )

    await page.getByRole('button', { name: 'Gespräch beenden' }).click()
    await expect(page.getByText('Nicht verbunden', { exact: true })).toBeVisible({ timeout: 10_000 })
  })
})
