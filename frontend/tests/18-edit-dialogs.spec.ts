import { test, expect } from '@playwright/test'
import { login } from './helpers'

test.beforeEach(async ({ page }) => {
  await page.route('**/api/auth/login', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      token: 'test-token',
      user: { id: 'test', email: 'paddy22@gmx.de', name: 'Test User', role: 'user' },
    }),
  }))
})

test('Telefonbuch öffnet per Doppelklick einen modalen Editor mit E-Mail', async ({ page }) => {
  await page.route('**/api/telephony/calls', route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  await page.route('**/api/telephony/phonebook', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([{ number: '+491234', name: 'Ada Lovelace', email: 'ada@example.org', notes: ['Test'] }]),
  }))
  await login(page)
  await page.locator('nav button[title*="Telefonie"]').first().click()
  await page.getByRole('button', { name: 'Telefonate' }).click()
  await page.locator('.phonebook-item').dblclick()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.locator('input[type="email"]')).toHaveValue('ada@example.org')
})

test('Termin-Editor öffnet per Doppelklick und verwaltet Teilnehmer per Drag-and-drop', async ({ page }) => {
  await page.route('**/api/resources/termine', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([{ bespr_nr: 1, bezeichnung: 'Testtermin', intervall: 'W', intervall_text: 'Wöchentlich', dauer_min: 30, teilnehmer: [] }]),
  }))
  await page.route('**/api/intervalle', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([{ kuerzel: 'W', bedeutung: 'Wöchentlich' }]),
  }))
  await page.route('**/api/resources/gruppen', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([{ gruppe: 'A', bereich: 'Bereich A', mitglieder: [{ nummer: 'A1', bezeichnung: 'Benutzer A1', name: 'Ada' }] }]),
  }))
  await login(page)
  await page.locator('nav button[title*="Ressourcen"]').first().click()
  await page.getByRole('button', { name: 'Termine', exact: true }).click()
  await page.getByRole('row', { name: /Testtermin/ }).dblclick()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: /Benutzer A1/ }).dragTo(dialog.locator('.participant-selected'))
  await expect(dialog.getByText('1 ausgewählt')).toBeVisible()
  await expect(dialog.locator('.participant-selected')).toContainText('Benutzer A1')
})

test('Planungsregel öffnet per Doppelklick im einheitlichen modalen Editor', async ({ page }) => {
  await page.route('**/api/planning/regeln', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([{ id: 1, bezeichnung: 'Regel 1', typ: 'constraint', bedingung: 'Testbedingung', prioritaet: 5, aktiv: 1 }]),
  }))
  await login(page)
  await page.locator('nav button[title*="Planung"]').first().click()
  const firstRule = page.locator('.resource-table tbody tr').first()
  await firstRule.dblclick()
  await expect(page.getByRole('dialog')).toBeVisible()
})
