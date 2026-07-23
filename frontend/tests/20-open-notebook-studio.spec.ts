import { test, expect } from '@playwright/test'

test('vollständiges Open-Notebook-Studio ist über HTTPS verfügbar', async ({ page }) => {
  await page.goto('https://open-notebook.ai-server.org/notebooks')
  await expect(page).toHaveURL(/open-notebook\.ai-server\.org\/notebooks/)
  await expect(page.locator('body')).not.toContainText(/Internal Server Error|Bad Gateway|Application error/i)
  const password = process.env.OPEN_NOTEBOOK_TEST_PASSWORD
  if (password) {
    await page.getByPlaceholder('Password').fill(password)
    await page.getByRole('button', { name: 'Sign In' }).click()
  }
  await expect(page.locator('body')).toContainText(/Notebook/i)

  const navigation = page.getByRole('link')
  await expect(navigation.filter({ hasText: /Notebooks/i }).first()).toBeVisible()
  await expect(navigation.filter({ hasText: /Sources/i }).first()).toBeVisible()
  await expect(navigation.filter({ hasText: /Podcasts/i }).first()).toBeVisible()
})
