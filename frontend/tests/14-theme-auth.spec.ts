import { test, expect, Page } from '@playwright/test'
import { login, getTheme } from './helpers'

let sharedPage: Page

test.describe('Theme in Authenticated App', () => {
  test.describe.configure({ mode: 'serial' })
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(60_000)
    sharedPage = await browser.newPage()
    await login(sharedPage)
  })

  test.afterAll(async () => {
    await sharedPage.close()
  })

  test('theme persists in authenticated app', async () => {
    await sharedPage.locator('nav button[title="Einstellungen"]').first().click()
    await expect(sharedPage.getByText('Dunkel').first()).toBeVisible({ timeout: 10_000 })
    await sharedPage.getByRole('button', { name: 'Hell' }).first().click()
    expect(await getTheme(sharedPage)).toBe('light')
    await sharedPage.getByRole('button', { name: 'Dunkel' }).first().click()
    expect(await getTheme(sharedPage)).toBe('dark')
  })
})
