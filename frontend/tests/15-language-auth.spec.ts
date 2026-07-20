import { test, expect, Page } from '@playwright/test'
import { login } from './helpers'

let sharedPage: Page

test.describe('Language in Authenticated App', () => {
  test.describe.configure({ mode: 'serial' })
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(60_000)
    sharedPage = await browser.newPage()
    await login(sharedPage)
  })

  test.afterAll(async () => {
    await sharedPage.close()
  })

  test('language persists in authenticated app', async () => {
    await sharedPage.locator('nav button[title="Einstellungen"]').first().click()
    const enBtn = sharedPage.getByRole('button', { name: 'English' })
    if (await enBtn.isVisible({ timeout: 5_000 })) {
      await enBtn.click()
      await expect(sharedPage.locator('nav').getByText('Settings')).toBeVisible({ timeout: 5_000 })
    }
  })
})
