// Disabled: replaced by smoke.spec.ts which uses pre-authenticated storageState.
// Re-enable only if you want slower, UI-login-based coverage for these flows.
import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.skip('workflows tests disabled – use smoke.spec.ts', () => {});

// ── Admin ────────────────────────────────────────────────────────────────────

test('admin: fees page has Assign Fee button', async ({ page }) => {
  await login(page, 'admin@uthaan.com', 'admin123456');
  await page.goto('/fees');
  await expect(page.getByRole('button', { name: /assign fee/i })).toBeVisible();
});

test('admin: announcements page loads', async ({ page }) => {
  await login(page, 'admin@uthaan.com', 'admin123456');
  await page.goto('/announcements');
  await expect(page).toHaveURL(/\/announcements/);
  await expect(page.getByText('Announcements').first()).toBeVisible();
});

// ── Teacher ──────────────────────────────────────────────────────────────────

test('teacher: submissions page has class dropdown', async ({ page }) => {
  await login(page, 'teacher@uthaan.com', 'teacher123456');
  await page.goto('/submissions');
  await expect(page.getByRole('combobox').first()).toBeVisible();
});

test('teacher: marks page loads', async ({ page }) => {
  await login(page, 'teacher@uthaan.com', 'teacher123456');
  await page.goto('/marks');
  await expect(page.getByRole('heading', { name: 'Gradebook' })).toBeVisible();
});

// ── Student ──────────────────────────────────────────────────────────────────

test('student: fees page loads without redirect', async ({ page }) => {
  await login(page, 'student1@uthaan.com', 'student123456');
  await page.goto('/fees');
  await expect(page).toHaveURL(/\/fees/);
  await expect(page.getByRole('heading', { name: 'Fees' })).toBeVisible();
});

test('student: submissions page loads assignment list or empty state', async ({ page }) => {
  await login(page, 'student1@uthaan.com', 'student123456');
  await page.goto('/submissions');
  await expect(page.getByRole('heading', { name: 'Submissions' })).toBeVisible();
});
