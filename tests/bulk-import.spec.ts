/**
 * Bulk CSV import test suite — 7 scenarios, admin role only.
 *
 * Uses saved auth state from globalSetup (admin.json).
 * Screenshots are captured automatically on failure (configured in playwright.config.ts).
 * All test roll numbers are prefixed "PW-BULK-*" so they are easy to identify
 * in the database and safe to clean up manually if needed.
 *
 * Summary of scenarios:
 * ─────────────────────────────────────────────────────────────────
 * 1. Happy path          — 3 valid students imported, appear in list
 * 2. Duplicate roll_no   — second row skipped, not doubled
 * 3. Missing fields      — blank class_num row skipped with error msg
 * 4. Wrong file type     — .xlsx / .txt shows error, no import button
 * 5. Empty CSV           — header only shows "Need a header row…"
 * 6. Large upload        — 210 rows completes without timeout
 * 7. Wrong column names  — mismatched headers show which columns are missing
 * ─────────────────────────────────────────────────────────────────
 */

import { test, expect, type Page } from '@playwright/test'
import { authFile } from './helpers/auth'

// ── Shared helpers ────────────────────────────────────────────────────────────

/** Navigate to /admin and switch to the Bulk Import tab. */
async function openBulkImportTab(page: Page) {
  await page.goto('/admin')
  // Fail fast if auth state is stale / redirect to login happened
  await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 })
  await page.getByRole('button', { name: 'Bulk Import' }).click()
  // File input must appear before we attempt uploads
  await expect(page.locator('input[type="file"]')).toBeVisible({ timeout: 10000 })
}

/** Set a CSV string on the file input without opening the OS dialog. */
async function uploadCSV(page: Page, filename: string, csvContent: string) {
  await page.locator('input[type="file"]').setInputFiles({
    name: filename,
    mimeType: 'text/csv',
    buffer: Buffer.from(csvContent, 'utf-8'),
  })
}

// ── 1. Happy path ─────────────────────────────────────────────────────────────

test('bulk import: happy path — 3 valid students imported and visible in list', async ({ browser }) => {
  const ctx = await browser.newContext({ storageState: authFile('admin') })
  const page = await ctx.newPage()

  await openBulkImportTab(page)

  // Unique timestamp-prefixed roll numbers prevent collisions across runs
  const ts = Date.now()
  const csvContent = [
    'name,roll_no,class_num,stage,email',
    `PW Student Alpha,PW-BULK-${ts}-1,5,matric,`,
    `PW Student Beta,PW-BULK-${ts}-2,6,matric,`,
    `PW Student Gamma,PW-BULK-${ts}-3,7,matric,`,
  ].join('\n')

  await uploadCSV(page, 'valid_students.csv', csvContent)

  // Preview table must show 3 rows ready
  await expect(page.getByText('3 students ready to import')).toBeVisible({ timeout: 5000 })

  // Import button text includes the count
  await page.getByRole('button', { name: /import all 3 students/i }).click()

  // Wait for the green success banner
  await expect(page.getByText(/import complete/i)).toBeVisible({ timeout: 30000 })
  await expect(page.getByText('3 students added')).toBeVisible()

  // ── Verify students appear in the Students tab list ──
  await page.getByRole('button', { name: 'Students' }).click()
  // Scope to the Students tab search input specifically (command palette also has a search input in the DOM)
  await expect(page.locator('input[placeholder*="Search by name"]')).toBeVisible({ timeout: 5000 })

  await page.locator('input[placeholder*="Search by name"]').fill('PW Student Alpha')
  await expect(page.getByText('PW Student Alpha')).toBeVisible({ timeout: 10000 })

  await ctx.close()
})

// ── 2. Duplicate roll numbers ─────────────────────────────────────────────────

test('bulk import: duplicate roll_no is skipped — not silently doubled', async ({ browser }) => {
  const ctx = await browser.newContext({ storageState: authFile('admin') })
  const page = await ctx.newPage()

  await openBulkImportTab(page)

  // Two rows with the same roll_no in one batch.
  // API inserts the first, then finds the roll already exists for the second → skipped.
  const ts = Date.now()
  const dupRoll = `PW-DUP-${ts}`
  const csvContent = [
    'name,roll_no,class_num,stage,email',
    `PW Dup First,${dupRoll},8,matric,`,
    `PW Dup Second,${dupRoll},8,matric,`,
  ].join('\n')

  await uploadCSV(page, 'duplicates.csv', csvContent)
  await expect(page.getByText('2 students ready to import')).toBeVisible({ timeout: 5000 })

  await page.getByRole('button', { name: /import all 2 students/i }).click()
  await expect(page.getByText(/import complete/i)).toBeVisible({ timeout: 30000 })

  // Exactly 1 added, 1 skipped — must never silently create both
  await expect(page.getByText('1 students added')).toBeVisible()
  await expect(page.getByText(/1 skipped/)).toBeVisible()

  await ctx.close()
})

// ── 3. Missing required fields ────────────────────────────────────────────────

test('bulk import: rows with missing fields are rejected with an error message', async ({ browser }) => {
  const ctx = await browser.newContext({ storageState: authFile('admin') })
  const page = await ctx.newPage()

  await openBulkImportTab(page)

  const ts = Date.now()
  const csvContent = [
    'name,roll_no,class_num,stage,email',
    // Valid row
    `PW Valid Row,PW-MIS-${ts}-1,5,matric,`,
    // Blank class_num → client parseCSV keeps this row (name present), API rejects it
    `PW Blank Class,PW-MIS-${ts}-2,,matric,`,
    // Blank name → parseCSV's .filter(r => r.name) silently drops this before preview
    `,PW-MIS-${ts}-3,5,matric,`,
  ].join('\n')

  await uploadCSV(page, 'missing_fields.csv', csvContent)

  // Preview shows 2 rows (blank-name row filtered out client-side before display)
  await expect(page.getByText('2 students ready to import')).toBeVisible({ timeout: 5000 })

  await page.getByRole('button', { name: /import all 2 students/i }).click()
  await expect(page.getByText(/import complete/i)).toBeVisible({ timeout: 30000 })

  // API skips the blank-class row and returns an error for it
  await expect(page.getByText(/1 skipped/)).toBeVisible()
  await expect(page.getByText(/some rows had errors/i)).toBeVisible()

  await ctx.close()
})

// ── 4. Wrong file type ────────────────────────────────────────────────────────

test('bulk import: non-CSV file shows an error and does not crash', async ({ browser }) => {
  const ctx = await browser.newContext({ storageState: authFile('admin') })
  const page = await ctx.newPage()

  await openBulkImportTab(page)

  // Simulate an Excel file (ZIP magic bytes — definitely not parseable as CSV)
  await page.locator('input[type="file"]').setInputFiles({
    name: 'students.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from('PK\x03\x04fake xlsx binary content that is not a valid CSV'),
  })

  // parseCSV reads the binary as text — headers won't match required columns
  // → shows either "Missing columns" or "Need a header row"
  const errorDiv = page.locator('div.bg-red-50').filter({
    hasText: /missing columns|need a header row/i,
  })
  await expect(errorDiv).toBeVisible({ timeout: 5000 })

  // Import button must NOT appear (no valid rows were parsed)
  await expect(page.getByRole('button', { name: /import all/i })).not.toBeVisible()

  // ── Also test a plain .txt file with non-tabular content ──
  await page.locator('input[type="file"]').setInputFiles({
    name: 'students.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('This is not a CSV file\nJust some plain text lines'),
  })

  // .txt with wrong content → "Missing columns" (two lines, but no name/roll_no/class_num headers)
  await expect(
    page.locator('div.bg-red-50').filter({ hasText: /missing columns/i })
  ).toBeVisible({ timeout: 5000 })

  await expect(page.getByRole('button', { name: /import all/i })).not.toBeVisible()

  await ctx.close()
})

// ── 5. Empty CSV (header only) ────────────────────────────────────────────────

test('bulk import: empty CSV (header only) shows "Need a header row" message', async ({ browser }) => {
  const ctx = await browser.newContext({ storageState: authFile('admin') })
  const page = await ctx.newPage()

  await openBulkImportTab(page)

  // Valid header, zero data rows — parseCSV checks lines.length < 2
  await uploadCSV(page, 'empty.csv', 'name,roll_no,class_num,stage,email')

  await expect(
    page.getByText(/need a header row and at least one student/i)
  ).toBeVisible({ timeout: 5000 })

  // No import button, no preview table
  await expect(page.getByRole('button', { name: /import all/i })).not.toBeVisible()
  await expect(page.getByText(/students ready to import/)).not.toBeVisible()

  await ctx.close()
})

// ── 6. Large upload (210 rows) ────────────────────────────────────────────────

test('bulk import: 210-row CSV completes without timing out', async ({ browser }) => {
  // Per-test timeout override — 210 API inserts + DB round-trips need room
  test.setTimeout(90000)

  const ctx = await browser.newContext({ storageState: authFile('admin') })
  const page = await ctx.newPage()

  await openBulkImportTab(page)

  const ts = Date.now()
  const lines = ['name,roll_no,class_num,stage,email']
  for (let i = 1; i <= 210; i++) {
    lines.push(`PW Large ${String(i).padStart(3, '0')},PW-LG-${ts}-${i},${(i % 8) + 1},matric,`)
  }
  const csvContent = lines.join('\n')

  await uploadCSV(page, 'large_import.csv', csvContent)

  // Preview should report all 210 rows
  await expect(page.getByText('210 students ready to import')).toBeVisible({ timeout: 5000 })

  // The preview table only renders first 10 with a "…and 200 more students" overflow row
  await expect(page.getByText(/and 200 more students/i)).toBeVisible()

  await page.getByRole('button', { name: /import all 210 students/i }).click()

  // Give the API 60 s for 210 sequential DB inserts
  await expect(page.getByText(/import complete/i)).toBeVisible({ timeout: 60000 })

  // Result banner must be visible — regardless of added vs skipped on re-runs
  await expect(
    page.locator('div.bg-green-50').filter({ hasText: /import complete/i })
  ).toBeVisible()

  await ctx.close()
})

// ── 7. Wrong column names ─────────────────────────────────────────────────────

test('bulk import: mismatched column headers show which columns are missing', async ({ browser }) => {
  const ctx = await browser.newContext({ storageState: authFile('admin') })
  const page = await ctx.newPage()

  await openBulkImportTab(page)

  // Plausible but wrong header names a user might try
  const csvContent = [
    'student_name,id_number,grade_level,section,contact',
    'Wrong Name,ID-001,9,A,wrong@test.com',
  ].join('\n')

  await uploadCSV(page, 'wrong_headers.csv', csvContent)

  // parseCSV reports which required columns are missing
  await expect(page.getByText(/missing columns/i)).toBeVisible({ timeout: 5000 })

  // All three required columns must be named in the error
  const errorText = await page.locator('div.bg-red-50').innerText()
  expect(errorText).toMatch(/name/)
  expect(errorText).toMatch(/roll_no/)
  expect(errorText).toMatch(/class_num/)

  // No import button or preview must appear
  await expect(page.getByRole('button', { name: /import all/i })).not.toBeVisible()
  await expect(page.getByText(/students ready to import/)).not.toBeVisible()

  await ctx.close()
})
