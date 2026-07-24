import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('organaizer_token', 'test-token'))
  await page.route('**/api/auth/me', route => route.fulfill({ json: { id: 'test', email: 'test@example.org', name: 'Test', role: 'admin' } }))
  await page.route('**/api/obsidian/**', route => route.fulfill({ json: { tree: { type: 'directory', name: '', path: '', children: [] }, tags: [], notes: [] } }))
})

test('optionale Arbeitsbereiche erscheinen nur nach Konfiguration', async ({ page }) => {
  await page.route('**/api/verbindungen/capabilities', route => route.fulfill({ json: {
    open_notebook: { added: false, configured: false, public_url: '' },
    slidev: { added: true, configured: true, public_url: 'https://slidev.example.org' },
    n8n: { added: true, configured: true, public_url: 'https://n8n.example.org' },
  } }))
  await page.route('**/api/slidev/project', route => route.fulfill({ json: { content: '# Demo' } }))
  await page.goto('/')
  await page.locator('nav button[title^="Wissen"]').click()
  await expect(page.getByRole('button', { name: 'Recherche-Notebooks' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Präsentationen' }).click()
  await expect(page.getByText('Markdown bearbeiten')).toBeVisible()
  await page.locator('nav button[title^="Aufgaben"]').click()
  await page.getByRole('button', { name: 'n8n' }).click()
  await expect(page.locator('iframe[title="n8n"]')).toHaveAttribute('src', 'https://n8n.example.org')
})
