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
  await page.getByRole('button', { name: 'Telefonbuch' }).click()
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
  await page.route('**/api/resources/raeume', route => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify([{ id: 7, bezeichnung: 'Raum Berlin', gebaeude: 'Haus A', kapazitaet: 12, ausstattung: '', aktiv: 1 }]),
  }))
  await page.route('**/api/resources/komponenten', route => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify([{ id: 9, bezeichnung: 'Beamer', typ: 'Technik', beschreibung: '', verfuegbar: 1 }]),
  }))
  await login(page)
  await page.locator('nav button[title*="Ressourcen"]').first().click()
  await page.getByRole('button', { name: 'Termine', exact: true }).click()
  await page.getByRole('row', { name: /Testtermin/ }).dblclick()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: /Benutzer A1/ }).dragTo(dialog.locator('.participant-picker').first().locator('.participant-selected'))
  await expect(dialog.locator('.participant-picker').first()).toContainText('1 ausgewählt')
  await expect(dialog.locator('.participant-picker').first().locator('.participant-selected')).toContainText('Benutzer A1')
  await dialog.getByRole('button', { name: /Raum Berlin/ }).dragTo(dialog.locator('.assignment-picker').nth(0).locator('.participant-selected'))
  await dialog.getByRole('button', { name: /Beamer/ }).dragTo(dialog.locator('.assignment-picker').nth(1).locator('.participant-selected'))
  await expect(dialog.locator('.assignment-picker').nth(0)).toContainText('1 ausgewählt')
  await expect(dialog.locator('.assignment-picker').nth(1)).toContainText('1 ausgewählt')
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

test('Rollen ordnen Personen und Gruppen mit derselben Drag-and-drop-UI zu', async ({ page }) => {
  await page.route('**/api/resources/rollen', route => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify([{ id: 1, bezeichnung: 'Leitung', beschreibung: '', farbe: '#71717a', person_ids: [], gruppen_ids: [] }]),
  }))
  await page.route('**/api/resources/personen', route => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify([{ id: 2, vorname: 'Ada', nachname: 'Lovelace', email: 'ada@example.org', telefon: '', standort: 'Berlin', aktiv: 1 }]),
  }))
  await page.route('**/api/resources/gruppen', route => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify([{ gruppe: 'A', bereich: 'Bereich A', mitglieder: [{ nummer: 'A1', bezeichnung: 'Gruppe A1', name: '' }] }]),
  }))
  await login(page)
  await page.locator('nav button[title*="Ressourcen"]').first().click()
  await page.getByRole('button', { name: 'Rollen', exact: true }).click()
  await page.getByRole('row', { name: /Leitung/ }).dblclick()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: /Ada Lovelace/ }).dragTo(dialog.locator('.assignment-picker').nth(0).locator('.participant-selected'))
  await dialog.getByRole('button', { name: /Gruppe A1/ }).dragTo(dialog.locator('.assignment-picker').nth(1).locator('.participant-selected'))
  await expect(dialog.locator('.assignment-picker').nth(0)).toContainText('1 ausgewählt')
  await expect(dialog.locator('.assignment-picker').nth(1)).toContainText('1 ausgewählt')
})

test('Import zeigt ungültige Referenzen vor dem Überschreiben und bietet Abbruch an', async ({ page }) => {
  await page.route('**/api/import/validate', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      valid: false,
      issues: [{ severity: 'error', sheet: 'TerminRaeume', row: 3, message: 'Raum 999 existiert nicht' }],
    }),
  }))
  await login(page)
  await page.locator('nav button[title^="Termine"]').first().click()
  await page.locator('.import-export input[type="file"]').setInputFiles({
    name: 'ungueltig.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from('test'),
  })
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('Raum 999 existiert nicht')
  await expect(dialog.getByRole('button', { name: 'Trotz Problemen importieren' })).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Abbrechen' })).toBeVisible()
})
