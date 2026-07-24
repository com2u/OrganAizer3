import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('organaizer_token', 'test-token'))
  await page.route('**/api/auth/me', route => route.fulfill({
    json: { id: 'test', email: 'test@example.org', name: 'Test User', role: 'admin' },
  }))
  await page.route('**/api/verbindungen/capabilities', route => route.fulfill({ json: {
    open_notebook: { added: true, configured: true, public_url: 'https://open-notebook.ai-server.org' },
    slidev: { added: false, configured: false, public_url: '' },
    hyperframes: { added: false, configured: false, public_url: '' },
    n8n: { added: false, configured: false, public_url: '' },
  } }))
  await page.route('**/api/obsidian/**', route => route.fulfill({ json: { tree: { type: 'directory', name: '', path: '', children: [] }, tags: [], notes: [] } }))
})

test('Recherche-Notebooks integriert Status, Übersicht und Anlage', async ({ page }) => {
  let notebooks = [{ id: 'notebook:1', name: 'Marktanalyse', description: 'Quellen für die Strategie' }]
  await page.route('**/api/open-notebook/status', route => route.fulfill({ json: { available: true, public_url: 'https://open-notebook.ai-server.org' } }))
  await page.route('**/api/open-notebook/notebooks', async route => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON()
      notebooks = [...notebooks, { id: 'notebook:2', name: body.name, description: body.description }]
      return route.fulfill({ status: 201, json: notebooks[1] })
    }
    return route.fulfill({ json: notebooks })
  })

  await page.goto('/')
  await page.locator('nav button[title^="Wissen"]').click()
  await page.getByRole('button', { name: 'Recherche-Notebooks' }).click()
  await expect(page.getByText('Quellenbasierte KI-Recherche')).toBeVisible()
  await expect(page.locator('iframe[title="Recherche-Studio öffnen"]')).toHaveAttribute('src', 'https://open-notebook.ai-server.org')
  await expect(page.getByRole('button', { name: 'Zugangsschlüssel kopieren' })).toBeVisible()
  await page.getByRole('tab', { name: 'Notebook-Übersicht' }).click()
  await expect(page.getByText('Marktanalyse')).toBeVisible()
  await expect(page.getByText('Bereit', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Neues Notebook' }).click()
  await page.getByLabel('Name').fill('Projekt Phoenix')
  await page.getByLabel('Ziel und Kontext').fill('Entscheidungsgrundlage erstellen')
  await page.getByRole('button', { name: 'Notebook anlegen' }).click()
  await expect(page.getByText('Projekt Phoenix')).toBeVisible()
})

test('Recherche-Notebooks zeigt einen hilfreichen Offlinezustand', async ({ page }) => {
  await page.route('**/api/open-notebook/status', route => route.fulfill({ json: { available: false, public_url: '' } }))
  await page.goto('/')
  await page.locator('nav button[title^="Wissen"]').click()
  await page.getByRole('button', { name: 'Recherche-Notebooks' }).click()
  await expect(page.getByText('Recherche-Dienst wird noch gestartet')).toBeVisible()
  await page.getByRole('tab', { name: 'Notebook-Übersicht' }).click()
  await expect(page.getByRole('button', { name: 'Neues Notebook' })).toBeDisabled()
})
