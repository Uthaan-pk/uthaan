/**
 * Auth smoke – kept minimal.
 * Full per-role login is handled once in globalSetup (storageState files).
 * This file only verifies that unauthenticated access redirects to /login.
 */
import { test, expect } from '@playwright/test'

test('unauthenticated access redirects to login', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
})
