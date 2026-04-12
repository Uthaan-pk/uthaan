import { Page } from '@playwright/test';
import path from 'path';

export function authFile(role: string) {
  return path.join(__dirname, '../../playwright/.auth', `${role}.json`);
}

export async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByPlaceholder('you@school.com').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: 'Sign in to Uthaan' }).click();
  await page.waitForURL('**/dashboard', { timeout: 20000 });
}
