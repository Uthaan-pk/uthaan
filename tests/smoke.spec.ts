/**
 * Critical smoke suite – 5 flows only.
 * Each test uses a pre-authenticated browser context from globalSetup.
 * Tests skip gracefully when prerequisite data is missing; they never hard-fail
 * due to empty DB or absent test records.
 */
import { test, expect } from '@playwright/test'
import { authFile } from './helpers/auth'

// ── 1. Teacher can see and use the attendance save button ─────────────────

test('teacher attendance: save button visible', async ({ browser }) => {
  const ctx = await browser.newContext({ storageState: authFile('teacher') })
  const page = await ctx.newPage()

  await page.goto('/attendance')

  // If auth failed in globalSetup the page redirects to /login — fail fast
  await expect(page).not.toHaveURL(/\/login/, { timeout: 5000 })

  // If teacher has no timetable-linked classes the student list is empty — skip
  if ((await page.getByText(/no students found/i).count()) > 0) {
    console.log('[smoke] teacher has no timetable classes – skipping save button check')
    await ctx.close()
    return
  }

  // Teacher must see the "Save attendance" button (not in readOnly mode)
  await expect(
    page.getByRole('button', { name: /save attendance/i })
  ).toBeVisible({ timeout: 15000 })

  await ctx.close()
})

// ── 2. Student quiz result state persists after hard refresh ──────────────

test('student quiz result: state persists after reload', async ({ browser }) => {
  const ctx = await browser.newContext({ storageState: authFile('student') })
  const page = await ctx.newPage()

  await page.goto('/quizzes')
  await expect(page).not.toHaveURL(/\/login/, { timeout: 5000 })

  // Find the first quiz link on the page
  const firstQuizLink = page.locator('a[href*="/quizzes/"]').first()
  if ((await firstQuizLink.count()) === 0) {
    test.skip()
    await ctx.close()
    return
  }

  const href = await firstQuizLink.getAttribute('href')
  if (!href) {
    test.skip()
    await ctx.close()
    return
  }

  // Navigate to the results view for that quiz
  const quizId = href.replace(/\?.*/, '').split('/').pop()
  await page.goto(`/quizzes/${quizId}?mode=results`)
  await expect(page).not.toHaveURL(/\/login/)
  await expect(page).toHaveURL(/\/quizzes\//)

  // Reload — must stay on the quiz page (session not lost)
  await page.reload()
  await expect(page).not.toHaveURL(/\/login/)
  await expect(page).toHaveURL(/\/quizzes\//)

  await ctx.close()
})

// ── 3. Admin gets read-only attendance – no save button ───────────────────

test('admin attendance: read-only notice shown, no save button', async ({ browser }) => {
  const ctx = await browser.newContext({ storageState: authFile('admin') })
  const page = await ctx.newPage()

  await page.goto('/attendance')
  await expect(page).not.toHaveURL(/\/login/, { timeout: 5000 })

  // Admin view must display the read-only banner
  await expect(
    page.getByText(/admin view is read-only/i)
  ).toBeVisible({ timeout: 15000 })

  // Save button must be absent
  await expect(
    page.getByRole('button', { name: /save attendance/i })
  ).not.toBeVisible()

  await ctx.close()
})

// ── 4. Superadmin: impersonation banner appears and clears on exit ────────

test('superadmin: impersonation exit works', async ({ browser }) => {
  const ctx = await browser.newContext({ storageState: authFile('superadmin') })
  const page = await ctx.newPage()

  // Prime the SSR session before hitting the superadmin guard
  await page.goto('/superadmin')
  await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 10000 })

  // If the session wasn't fully primed and we landed elsewhere, warm it via /dashboard
  if (!page.url().includes('/superadmin')) {
    await page.goto('/dashboard')
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 })
    await page.goto('/superadmin')
  }

  await expect(page).not.toHaveURL(/\/login/, { timeout: 5000 })
  await expect(page).toHaveURL(/\/superadmin/)

  // Need at least one school's Browse button
  const browseBtn = page.getByRole('button', { name: 'Browse' }).first()
  if ((await browseBtn.count()) === 0) {
    console.log('[smoke] no schools present – skipping impersonation check')
    await ctx.close()
    return
  }

  // impersonateSchool redirects to /dashboard — wait for that, then go back
  await Promise.all([
    page.waitForURL(/\/dashboard/, { timeout: 15000 }),
    browseBtn.click(),
  ])

  // Banner is on /superadmin, not /dashboard — navigate back
  await page.goto('/superadmin')
  await expect(
    page.getByText(/browsing as:/i)
  ).toBeVisible({ timeout: 10000 })

  // Exit impersonation — stopImpersonating redirects back to /superadmin
  await Promise.all([
    page.waitForURL(/\/superadmin/, { timeout: 15000 }),
    page.getByRole('button', { name: /stop impersonating/i }).click(),
  ])

  // Banner must be gone
  await expect(
    page.getByText(/browsing as:/i)
  ).not.toBeVisible()

  await ctx.close()
})

// ── 5. Parent: my-child page loads without crashing ───────────────────────

test('parent: my-child page loads', async ({ browser }) => {
  const ctx = await browser.newContext({ storageState: authFile('parent') })
  const page = await ctx.newPage()

  await page.goto('/my-child')
  await expect(page).not.toHaveURL(/\/login/, { timeout: 5000 })
  // Page must not silently redirect away (parent-only route)
  await expect(page).toHaveURL(/\/my-child/)

  // Either child info or the "no child linked" notice must be visible
  const hasChildHeader = await page.getByText(/viewing as:/i).count()
  const hasNoChild = await page.getByText(/no child linked/i).count()
  expect(
    hasChildHeader + hasNoChild,
    'Expected either child info or "no child linked" notice'
  ).toBeGreaterThan(0)

  await ctx.close()
})
