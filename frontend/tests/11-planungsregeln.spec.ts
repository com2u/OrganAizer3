import { test, expect } from '@playwright/test'
import { login } from './helpers'

test('Planungsregeln sind nummeriert und editierbar', async ({ page }) => {
  await login(page)
  await page.locator('nav button[title*="Planung"]').first().click()

  const table = page.locator('.resource-table')
  await expect(table).toBeVisible()
  await expect(table.locator('thead th').first()).toHaveText('Nr.')
  await expect(table.locator('tbody tr')).toHaveCount(26)
  await expect(table.locator('tbody tr').first().locator('td').first()).toHaveText('1')
  await expect(table.locator('tbody tr').last().locator('td').first()).toHaveText('26')

  await table.locator('tbody tr').first().locator('.btn-icon').first().click()
  const form = page.locator('.resource-form')
  await expect(form).toBeVisible()
  await expect(form.locator('input').first()).toHaveValue('Allgemeine Besprechungszeiten')
  await form.getByRole('button', { name: /Abbrechen|Cancel/ }).click()
  await expect(form).toBeHidden()
})

test('Planen wählt Regeln vor und zeigt Validierung im Dialog', async ({ page }) => {
  await page.route('**/api/planning/models', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      default: 'openai/gpt-4.1-mini',
      models: [
        { id: 'openai/gpt-4.1-mini', name: 'GPT-4.1 Mini', description: 'Test model', pricing: {} },
        { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', description: 'Alternative', pricing: {} },
      ],
    }),
  }))
  await page.route('**/api/planning/validate', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      valid: false,
      summary: 'Ein Konflikt',
      model: 'openai/gpt-4.1-mini',
      issues: [{ severity: 'warning', title: 'Zeitkonflikt', description: 'Regeln überschneiden sich.' }],
    }),
  }))
  await login(page)
  await page.locator('nav button[title*="Planung"]').first().click()
  await page.getByRole('button', { name: /^Planen$/ }).click()

  const summary = page.locator('.planning-rules-summary')
  await expect(summary).toContainText('26 von 26 ausgewählt')
  await expect(page.locator('.planning-rule-details')).toBeHidden()
  await summary.click()
  await expect(page.locator('.planning-rule-details input[type="checkbox"]:checked')).toHaveCount(27)

  await page.getByPlaceholder('Modelle durchsuchen…').fill('Claude')
  await expect(page.locator('.planning-model-picker select option')).toHaveCount(1)
  await page.getByPlaceholder('Modelle durchsuchen…').fill('')
  await page.getByRole('button', { name: 'Validieren' }).click()
  await expect(page.getByRole('dialog')).toContainText('Zeitkonflikt')
  await expect(page.getByRole('dialog')).toContainText('Regeln überschneiden sich.')
})
