import { test, expect } from '@playwright/test'
import { gotoLanding, getTheme } from './helpers'

test.describe('Theme Switching (Dark / Light)', () => {
  test('default theme is dark on landing page', async ({ page }) => {
    await gotoLanding(page)
    const theme = await getTheme(page)
    expect(theme).toBe('dark')
  })

  test('toggle to light mode changes data-theme', async ({ page }) => {
    await gotoLanding(page)
    await page.getByRole('button', { name: 'Hell' }).click()
    const theme = await getTheme(page)
    expect(theme).toBe('light')
  })

  test('toggle back to dark mode', async ({ page }) => {
    await gotoLanding(page)
    await page.getByRole('button', { name: 'Hell' }).click()
    expect(await getTheme(page)).toBe('light')
    await page.getByRole('button', { name: 'Dunkel' }).click()
    expect(await getTheme(page)).toBe('dark')
  })

  test('light mode has visible content (not all white)', async ({ page }) => {
    await gotoLanding(page)
    await page.getByRole('button', { name: 'Hell' }).click()
    expect(await getTheme(page)).toBe('light')
    await expect(page.locator('h1')).toBeVisible()
    const color = await page.locator('h1').evaluate(el => window.getComputedStyle(el).color)
    expect(color).not.toBe('rgb(255, 255, 255)')
  })
})
