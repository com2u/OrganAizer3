import { test, expect, type Page } from '@playwright/test'
import { login, gotoLanding } from './helpers'

let sharedPage: Page

test.describe('Login Flow', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(60_000)
    sharedPage = await browser.newPage()
  })

  test.afterAll(async () => {
    await sharedPage.close()
  })

  test('login form appears after clicking Anmelden', async () => {
    await gotoLanding(sharedPage)
    await sharedPage.getByRole('button', { name: 'Anmelden' }).first().click()
    await expect(sharedPage.getByRole('heading', { name: 'Anmelden' })).toBeVisible()
    await expect(sharedPage.locator('input[type="email"]')).toBeVisible()
    await expect(sharedPage.locator('input[type="password"]')).toBeVisible()
    await expect(sharedPage.getByRole('button', { name: 'Anmelden' })).toBeVisible()
  })

  test('successful login shows sidebar with navigation', async () => {
    await login(sharedPage)
    await expect(sharedPage.locator('nav')).toBeVisible()
    await expect(sharedPage.locator('nav').getByText('OrganAIzer')).toBeVisible()
    await expect(sharedPage.locator('nav').getByRole('button', { name: /^Assistent/ })).toBeVisible()
    await expect(sharedPage.locator('nav').getByRole('button', { name: 'Termine' })).toBeVisible()
    await expect(sharedPage.locator('nav').getByRole('button', { name: 'Aufgaben' })).toBeVisible()
    await expect(sharedPage.locator('nav').getByRole('button', { name: 'Sprache' })).toBeVisible()
    await expect(sharedPage.locator('nav').getByRole('button', { name: 'Wissen', exact: false }).filter({ hasText: 'Obsidian' })).toBeVisible()
  })

  test('user info displayed in sidebar', async () => {
    // Already logged in from previous test (serial mode)
    await expect(sharedPage.locator('nav').getByText('Patrick Hess')).toBeVisible()
    await expect(sharedPage.locator('nav').getByText('admin')).toBeVisible()
  })

  test('version v0.1.10 shown in sidebar', async () => {
    // Already logged in
    await expect(sharedPage.locator('nav').getByText('v0.1.10')).toBeVisible()
  })

  test('logout returns to landing page', async () => {
    // Already logged in
    await sharedPage.locator('nav').getByRole('button', { name: 'Abmelden' }).click()
    await expect(sharedPage.locator('h1')).toBeVisible({ timeout: 8_000 })
  })

  test('invalid credentials show error', async () => {
    // On landing page after logout
    await sharedPage.getByRole('button', { name: 'Anmelden' }).first().click()
    await sharedPage.locator('input[type="email"]').fill('wrong@example.com')
    await sharedPage.locator('input[type="password"]').fill('wrongpassword')
    await sharedPage.getByRole('button', { name: 'Anmelden' }).click()
    await expect(sharedPage.locator('nav')).not.toBeVisible({ timeout: 3_000 })
  })
})
