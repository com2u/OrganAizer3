import { test, expect } from '@playwright/test'
import { gotoLanding } from './helpers'

test.describe('Landing Page', () => {
  test('displays hero headline and CTA buttons', async ({ page }) => {
    await gotoLanding(page)
    // Headline
    await expect(page.locator('h1')).toContainText('Alles an einem Ort')
    // CTA buttons
    await expect(page.getByRole('button', { name: 'Anmelden' }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Zugang anfragen' }).first()).toBeVisible()
  })

  test('shows product preview section', async ({ page }) => {
    await gotoLanding(page)
    await expect(page.getByText('Produktvorschau')).toBeVisible()
    // Bento cells
    await expect(page.getByRole('heading', { name: 'Termine & Planung' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Aufgaben & Ressourcen' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'KI-Verbindungen' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Sprache & Wissen' })).toBeVisible()
  })

  test('shows workflow steps section', async ({ page }) => {
    await gotoLanding(page)
    await expect(page.getByRole('heading', { name: 'So arbeitet OrganAIzer' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Sammeln' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Strukturieren' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Handeln' })).toBeVisible()
  })

  test('shows principles section', async ({ page }) => {
    await gotoLanding(page)
    await expect(page.getByRole('heading', { name: 'Prinzipien' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Weniger Kontextwechsel' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Provider-neutral' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Eine Arbeitsoberfläche' })).toBeVisible()
  })

  test('footer mentions OpenWebUI authentication', async ({ page }) => {
    await gotoLanding(page)
    await expect(page.getByText('Authentifizierung über OpenWebUI')).toBeVisible()
  })

  test('theme toggle button exists in banner', async ({ page }) => {
    await gotoLanding(page)
    // The banner has theme and language toggle buttons
    await expect(page.getByRole('button', { name: 'Hell' })).toBeVisible()
  })

  test('language toggle shows English option', async ({ page }) => {
    await gotoLanding(page)
    await expect(page.getByRole('button', { name: 'English' })).toBeVisible()
  })
})
