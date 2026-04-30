import { chromium } from '@playwright/test'
import path from 'path'
import fs from 'fs'

export const AUTH_DIR = path.join(__dirname, '../playwright/.auth')

const BASE_URL = process.env.TEST_BASE_URL ?? 'https://uthaan-one.vercel.app'

function requireValidBaseUrl() {
  try {
    const url = new URL(BASE_URL)
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('must use http or https')
    }
  } catch {
    throw new Error(
      `[global-setup] TEST_BASE_URL must be an absolute http(s) URL. Received: ${BASE_URL || '(empty)'}`
    )
  }
}

const ACCOUNTS = [
  { name: 'admin',      email: process.env.TEST_ADMIN_EMAIL      ?? 'admin@uthaan.com',      password: process.env.TEST_ADMIN_PASSWORD      ?? 'admin123456'      },
  { name: 'teacher',    email: process.env.TEST_TEACHER_EMAIL    ?? 'teacher@uthaan.com',    password: process.env.TEST_TEACHER_PASSWORD    ?? 'teacher123456'    },
  { name: 'student',    email: process.env.TEST_STUDENT_EMAIL    ?? 'student1@uthaan.com',   password: process.env.TEST_STUDENT_PASSWORD    ?? 'student123456'    },
  { name: 'parent',     email: process.env.TEST_PARENT_EMAIL     ?? 'parent@uthaan.com',     password: process.env.TEST_PARENT_PASSWORD     ?? 'parent123456'     },
  { name: 'superadmin', email: process.env.TEST_SUPERADMIN_EMAIL ?? 'superadmin@uthaan.com', password: process.env.TEST_SUPERADMIN_PASSWORD ?? 'superadmin123456' },
]

export default async function globalSetup() {
  requireValidBaseUrl()

  const required = [
    'TEST_ADMIN_EMAIL', 'TEST_ADMIN_PASSWORD',
    'TEST_TEACHER_EMAIL', 'TEST_TEACHER_PASSWORD',
    'TEST_STUDENT_EMAIL', 'TEST_STUDENT_PASSWORD',
    'TEST_PARENT_EMAIL', 'TEST_PARENT_PASSWORD',
    'TEST_SUPERADMIN_EMAIL', 'TEST_SUPERADMIN_PASSWORD',
  ];
  for (const key of required) {
    if (!process.env[key]) throw new Error(`[global-setup] Missing required env var: ${key}`)
  }

  fs.mkdirSync(AUTH_DIR, { recursive: true })

  const browser = await chromium.launch()

  for (const account of ACCOUNTS) {
    const authFile = path.join(AUTH_DIR, `${account.name}.json`)
    const context = await browser.newContext()
    const page = await context.newPage()

    try {
      await page.goto(`${BASE_URL}/login`)
      await page.getByPlaceholder('you@school.com').fill(account.email)
      await page.locator('input[type="password"]').fill(account.password)
      await page.getByRole('button', { name: 'Sign in to Uthaan' }).click()
      const expectedPaths =
        account.name === 'superadmin' ? ['/superadmin', '/dashboard'] : ['/dashboard']
      await page.waitForURL(
        (url) => expectedPaths.includes(url.pathname),
        { timeout: 20000 }
      )
      await context.storageState({ path: authFile })
      console.log(`[auth] ✓ ${account.name}`)
    } catch (err) {
      throw new Error(
        `[global-setup] Failed to authenticate ${account.name} at ${BASE_URL}. ` +
          `Check TEST_BASE_URL and the TEST_${account.name.toUpperCase()}_EMAIL/PASSWORD secrets. ` +
          `Original error: ${(err as Error).message}`
      )
    } finally {
      await context.close()
    }
  }

  await browser.close()
}
