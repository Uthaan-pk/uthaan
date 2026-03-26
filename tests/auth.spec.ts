import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test('admin login', async ({ page }) => {
  await login(page, 'admin@uthaan.com', 'admin123456');
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText(/admin/i).first()).toBeVisible();
});

test('teacher login', async ({ page }) => {
  await login(page, 'teacher@uthaan.com', 'teacher123456');
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText(/teacher/i).first()).toBeVisible();
});

test('student login', async ({ page }) => {
  await login(page, 'student1@uthaan.com', 'student123456');
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText(/student/i).first()).toBeVisible();
});

test('parent login', async ({ page }) => {
  await login(page, 'parent@uthaan.com', 'parent123456');
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText(/parent/i).first()).toBeVisible();
});
