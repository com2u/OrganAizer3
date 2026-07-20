import { test, expect, Page, request } from '@playwright/test'

/**
 * Global setup: authenticate once and save the auth state.
 * All test suites reuse this state via storageState.
 */

const API_BASE = 'http://localhost:4815/api'
const TEST_USER = {
  email: 'paddy22@gmx.de',
  password: 'PPH2com2u',
}

test.beforeAll(async ({ browser }) => {
  // We don't need global setup if using beforeEach login
  // This file exists for documentation purposes
})
