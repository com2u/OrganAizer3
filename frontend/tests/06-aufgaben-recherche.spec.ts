import { test, expect, Page } from '@playwright/test'
import { login } from './helpers'

let sharedPage: Page

test.describe('Aufgaben - Internet Recherche', () => {
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
    // Click the Aufgaben nav button (use title to disambiguate)
    await sharedPage.locator('nav button[title*="Aufgaben"]').first().click()
    await sharedPage.getByRole('button', { name: /Internetrecherche/ }).click()
  })

  test('recherche form is displayed', async () => {
    await expect(sharedPage.getByRole('heading', { name: 'Internetrecherche' })).toBeVisible()
    const queryInput = sharedPage.locator('input[type="text"]').first()
    await expect(queryInput).toBeVisible()
  })

  test('search button is disabled without query', async () => {
    const searchBtn = sharedPage.getByRole('button', { name: /Recherchieren/ })
    await expect(searchBtn).toBeDisabled()
  })

  test('search button enabled with query text', async () => {
    const queryInput = sharedPage.locator('input[type="text"]').first()
    await queryInput.fill('Künstliche Intelligenz')
    const searchBtn = sharedPage.getByRole('button', { name: /Recherchieren/ })
    await expect(searchBtn).toBeEnabled()
  })

  test('long research is polled and renders the final markdown result', async () => {
    let polls = 0
    await sharedPage.route('**/api/hermes/jobs', route => route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'research-1',
        status: 'queued',
        phase: 'Rechercheauftrag wurde an Hermes übergeben.',
      }),
    }))
    await sharedPage.route('**/api/hermes/jobs/research-1', route => {
      polls += 1
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify(polls === 1 ? {
          id: 'research-1',
          status: 'running',
          phase: 'Hermes recherchiert im Internet und wertet Quellen aus.',
        } : {
          id: 'research-1',
          status: 'completed',
          phase: 'Recherche abgeschlossen.',
          result: '# Geprüftes Ergebnis\n\nDie Recherche wurde erfolgreich abgeschlossen.',
        }),
      })
    })

    await sharedPage.locator('input[type="text"]').first().fill('Testthema')
    await sharedPage.getByRole('button', { name: /Recherchieren/ }).click()
    await expect(sharedPage.getByRole('status')).toContainText(/Hermes|Rechercheauftrag/)
    await expect(sharedPage.locator('.recherche-markdown')).toContainText('Geprüftes Ergebnis', { timeout: 10_000 })
    await expect(sharedPage.locator('.alert-error')).toHaveCount(0)
    expect(polls).toBeGreaterThanOrEqual(2)
  })

  test('depth selector has kurz and ausführlich options', async () => {
    const depthSelect = sharedPage.locator('select').filter({ hasText: /Kurz|Ausführlich|ausführlich/ })
    await expect(depthSelect).toBeVisible()
    const options = depthSelect.locator('option')
    await expect(options.nth(0)).toContainText(/Kurz/)
    await expect(options.nth(1)).toContainText(/Ausführlich|ausführlich/)
  })

  test('back button returns to overview', async () => {
    await sharedPage.getByRole('button', { name: /Zurück zur Aufgabenübersicht/ }).click()
    await expect(sharedPage.getByText('Was möchtest du erledigen?')).toBeVisible()
  })

  test('overview button in sidebar returns to overview', async () => {
    // Navigate to home first, then click Aufgaben
    await sharedPage.goto('/')
    await sharedPage.locator('nav').waitFor({ state: 'visible', timeout: 10_000 })
    const aufgabenBtn = sharedPage.locator('nav button[title*="Aufgaben"]').first()
    await aufgabenBtn.click()
    await expect(sharedPage.getByText('Was möchtest du erledigen?')).toBeVisible({ timeout: 5_000 })
  })

  test('checkmark button returns to overview', async () => {
    const heroBtn = sharedPage.locator('.hero-mark-btn')
    if (await heroBtn.isVisible()) {
      await heroBtn.click()
      await expect(sharedPage.getByText('Was möchtest du erledigen?')).toBeVisible()
    }
  })

  test('executed tab shows history or empty state', async () => {
    await sharedPage.getByRole('button', { name: /Zurück zur Aufgabenübersicht/ }).click()
    await sharedPage.getByRole('button', { name: /Ausgeführt/ }).click()
    // Wait for either the table or empty state to appear
    await sharedPage.waitForTimeout(2000)
    // Just verify the tab is active (has the executed content area)
    await expect(sharedPage.locator('.executed-tasks, .empty-state').first()).toBeVisible({ timeout: 5_000 })
  })
})
