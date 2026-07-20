import { test, expect } from '@playwright/test'
import { gotoLanding } from './helpers'

test.describe('Language Switching (DE / EN)', () => {
  test('default language is German', async ({ page }) => {
    await gotoLanding(page)
    await expect(page.getByText('Alles an einem Ort.').first()).toBeVisible()
  })

  test('switch to English changes visible text', async ({ page }) => {
    await gotoLanding(page)
    await page.getByRole('button', { name: 'English' }).click()
    await expect(page.getByText('Everything in one place.').first()).toBeVisible({ timeout: 5_000 })
  })

  test('switch back to German', async ({ page }) => {
    await gotoLanding(page)
    await page.getByRole('button', { name: 'English' }).click()
    await expect(page.getByText('Everything in one place.').first()).toBeVisible()
    await page.getByRole('button', { name: 'Deutsch' }).click()
    await expect(page.getByText('Alles an einem Ort.').first()).toBeVisible()
  })
})
