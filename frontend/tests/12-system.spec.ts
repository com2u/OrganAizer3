import { test, expect } from '@playwright/test'
import { login } from './helpers'

test('System zeigt CPU, RAM und Docker-Zustände', async ({ page }) => {
  await page.route('**/api/system/status', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      cpu_percent: 12.5,
      memory_total: 8 * 1024 ** 3,
      memory_used: 3 * 1024 ** 3,
      memory_percent: 37.5,
      timestamp: Date.now() / 1000,
      containers: [
        { id: 'abc', name: 'OrganAIzer', image: 'organaizer:latest', state: 'running', status: 'Up 2 hours' },
        { id: 'def', name: 'worker', image: 'worker:latest', state: 'exited', status: 'Exited (1)' },
      ],
    }),
  }))
  await login(page)
  await page.getByTitle('Einstellungen').click()
  await page.getByRole('button', { name: 'System' }).click()
  await expect(page.getByRole('heading', { name: 'System' })).toBeVisible()
  await expect(page.locator('.system-metric')).toContainText(['CPU12.5 %', 'RAM37.5 %', 'Container1 / 2'])
  await expect(page.locator('.system-container-list')).toContainText('OrganAIzer')
  await expect(page.locator('.container-state.state-running')).toHaveCount(1)
  await expect(page.locator('.container-state.state-exited')).toHaveCount(1)
})
