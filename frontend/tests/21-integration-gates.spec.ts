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
    hyperframes: { added: true, configured: true, public_url: 'https://hyperframes.example.org' },
    n8n: { added: true, configured: true, public_url: 'https://n8n.example.org' },
  } }))
  await page.route('**/api/slidev/projects', route => route.fulfill({ json: {
    active: 'Demo',
    projects: [{ name: 'Demo', active: true, tree: { name: 'Demo', path: '', type: 'directory', children: [{ name: 'slides.md', path: 'slides.md', type: 'file', size: 6 }, { name: 'public', path: 'public', type: 'directory', children: [] }] } }],
  } }))
  await page.route('**/api/slidev/projects/Demo/content', route => route.fulfill({ json: { content: '# Demo' } }))
  await page.route('**/api/hyperframes/status', route => route.fulfill({ json: { available: true, version: '0.7.70' } }))
  await page.route('**/api/workspace-auth/ticket/**', route => route.fulfill({ json: { ticket: 'signed-test-ticket' } }))
  await page.goto('/')
  await page.locator('nav button[title^="Wissen"]').click()
  await expect(page.getByRole('button', { name: 'Recherche-Notebooks' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Präsentationen' }).click()
  await expect(page.getByRole('button', { name: 'Bearbeiten' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Demo Aktiv' })).toBeVisible()
  await page.getByRole('button', { name: 'Sprecheransicht' }).click()
  await expect(page.locator('iframe[title="Slidev Sprecheransicht"]')).toHaveAttribute('src', 'https://slidev.example.org/workspace-login/slidev?ticket=signed-test-ticket&view=presenter')
  await page.getByRole('button', { name: 'HyperFrames' }).click()
  await expect(page.locator('iframe[title="HyperFrames Studio"]')).toHaveAttribute('src', 'https://hyperframes.example.org/workspace-login/hyperframes?ticket=signed-test-ticket')
  await page.locator('nav button[title^="Aufgaben"]').click()
  await page.getByRole('button', { name: 'n8n' }).click()
  await expect(page.locator('iframe[title="n8n"]')).toHaveAttribute('src', 'https://n8n.example.org')
})
