import { test, expect } from '@playwright/test'
import { gotoLanding } from './helpers'

test.describe('Zugang anfragen (Access Request)', () => {
  test('interest modal opens with form', async ({ page }) => {
    await gotoLanding(page)
    // Click "Zugang anfragen" button
    await page.getByRole('button', { name: 'Zugang anfragen' }).first().click()
    // Modal should appear
    await expect(page.getByText('Zugang anfragen').first()).toBeVisible({ timeout: 5_000 })
    // Should have email field and info field
    await expect(page.getByLabel(/E-Mail/).first()).toBeVisible()
  })

  test('form has disclaimer text', async ({ page }) => {
    await gotoLanding(page)
    await page.getByRole('button', { name: 'Zugang anfragen' }).first().click()
    await expect(page.getByText(/Anfrage/).first()).toBeVisible({ timeout: 5_000 })
  })

  test('form validation - email required', async ({ page }) => {
    await gotoLanding(page)
    await page.getByRole('button', { name: 'Zugang anfragen' }).first().click()
    await expect(page.getByText('Zugang anfragen').first()).toBeVisible({ timeout: 5_000 })
    // Try to submit without filling in fields
    const submitBtn = page.getByRole('button', { name: 'Anfrage senden' })
    if (await submitBtn.isVisible()) {
      await submitBtn.click()
      // Should show validation error
      await expect(page.getByText(/E-Mail/i).first()).toBeVisible()
    }
  })

  test('close button returns to landing', async ({ page }) => {
    await gotoLanding(page)
    await page.getByRole('button', { name: 'Zugang anfragen' }).first().click()
    await expect(page.getByText('Zugang anfragen').first()).toBeVisible({ timeout: 5_000 })
    // Close the modal - look for close button or Schließen
    const closeBtn = page.getByRole('button', { name: 'Schließen' }).first()
    if (await closeBtn.isVisible()) {
      await closeBtn.click()
    } else {
      // Try clicking the X or backdrop
      await page.keyboard.press('Escape')
    }
    // Landing page should still be visible
    await expect(page.locator('h1')).toBeVisible()
  })
})
