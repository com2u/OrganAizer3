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

test('lange Planung wird per Statusabfrage ohne Request-Timeout abgeschlossen', async ({ page }) => {
  let polls = 0
  await page.route('**/api/planning/models', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      default: 'moonshotai/kimi-k3',
      models: [{ id: 'moonshotai/kimi-k3', name: 'MoonshotAI: Kimi K3', description: '', pricing: {} }],
    }),
  }))
  await page.route('**/api/planning/auftraege', async route => {
    if (route.request().method() !== 'POST') return route.continue()
    await route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({ id: 99, bezeichnung: 'Test', woche_von: 1, woche_bis: 1, status: 'laeuft', ergebnis_json: null }),
    })
  })
  await page.route('**/api/planning/auftraege/99', route => {
    polls += 1
    const running = polls < 2
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 99,
        bezeichnung: 'Test',
        woche_von: 1,
        woche_bis: 1,
        status: running ? 'laeuft' : 'vorschlag',
        ergebnis_json: null,
        ergebnis: running ? null : {
          provider_status: 'connected',
          vorschlaege: [{ woche: 1, tag: 'Mon', start: '09:00', bespr_nr: 1 }],
          konflikte: [],
          bestehende_termine: 0,
          regeln_geladen: 26,
        },
      }),
    })
  })

  await login(page)
  await page.locator('nav button[title*="Planung"]').first().click()
  await page.getByRole('button', { name: /^Planen$/ }).click()
  await page.getByRole('button', { name: /KI-Planung starten/ }).click()

  await expect(page.getByRole('button', { name: /Planung läuft/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Excel-Vorschlag herunterladen/ })).toBeVisible({ timeout: 10_000 })
  expect(polls).toBeGreaterThanOrEqual(2)
})
