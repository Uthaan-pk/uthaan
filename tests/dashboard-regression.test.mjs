// Run with: node --test tests/dashboard-regression.test.mjs
// Execute the real server page with isolated auth/database dependencies; no live writes.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { renderToStaticMarkup } from 'react-dom/server'
import * as jsxRuntime from 'react/jsx-runtime'

const source = fs.readFileSync(process.env.DASHBOARD_TEST_SOURCE || 'app/dashboard/page.tsx', 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText

function loadPage({ role = 'admin', schoolId = null, schoolResult, signedIn = true, impersonating, schoolThrows = false } = {}) {
  let adminCalls = 0
  const filters = []
  const logs = []
  function client(admin) {
    return {
      auth: { getUser: async () => ({ data: { user: signedIn ? { id: 'user-1', email: 'test@example.com' } : null } }) },
      from(table) {
        const result = admin
          ? table === 'schools' ? schoolResult : { data: [], error: null }
          : table === 'user_roles' ? { data: { role, school_id: schoolId } } : { data: null }
        const query = new Proxy({}, {
          get(_, method) {
            if (method === 'then') return (resolve, reject) => admin && table === 'schools' && schoolThrows
              ? reject(new Error('private upstream details')) : resolve(result)
            return (...args) => {
              if (method === 'eq') filters.push({ table, args })
              return query
            }
          },
        })
        return query
      },
    }
  }
  const exports = {}
  const mocks = {
    'next/navigation': { redirect: (path) => { throw new Error(`REDIRECT:${path}`) } },
    'next/headers': { cookies: async () => ({ get: (key) => key === 'impersonate_school_id' && impersonating ? { value: impersonating } : undefined }) },
    '@/lib/supabase/server': { createClient: async () => client(false) },
    '@/lib/supabase/admin': { createAdminClient: () => { adminCalls++; return client(true) } },
    '@/lib/school': { resolveEffectiveRole: async (value) => value === 'superadmin' && impersonating ? 'admin' : value },
    '@/lib/translations': { translations: { en: {} } },
    '@/lib/constants': { CURRENT_YEAR: 2026, TERM_START_DATE: '2026-01-01' },
  }
  vm.runInNewContext(compiled, {
    exports,
    console: { warn: (...args) => logs.push(JSON.parse(JSON.stringify(args))) },
    require: (id) => id === 'react/jsx-runtime' ? jsxRuntime : mocks[id] || {},
  })
  return { page: exports.default, filters, logs, adminCalls: () => adminCalls }
}

test('admin without a school settles without privileged reads or a self-redirect', async () => {
  const app = loadPage()
  for (let i = 0; i < 3; i++) {
    const html = renderToStaticMarkup(await app.page())
    assert.match(html, /Dashboard unavailable/)
    assert.match(html, /action="\/auth\/signout"/)
    assert.match(html, /method="post"/)
  }
  assert.equal(app.adminCalls(), 0)
  assert.deepEqual(app.logs, Array.from({ length: 3 }, () => ['[dashboard] unavailable', { reason: 'MISSING_SCHOOL_ID', hasSchoolId: false }]))
})

for (const schoolResult of [{ data: null, error: null }, { data: null, error: { code: '42501' } }]) {
  for (const role of ['admin', 'superadmin']) {
    test(`${role}: unavailable school (${schoolResult.error ? 'error' : 'missing'}) settles with scoped queries`, async () => {
      const app = loadPage({ role, schoolId: 'school-1', impersonating: role === 'superadmin' ? 'school-2' : undefined, schoolResult })
      assert.match(renderToStaticMarkup(await app.page()), /Dashboard unavailable/)
      assert.deepEqual(app.logs, [['[dashboard] unavailable', { reason: schoolResult.error ? 'SCHOOL_LOOKUP_ERROR' : 'SCHOOL_NOT_FOUND', hasSchoolId: true }]])
      const expectedSchool = role === 'superadmin' ? 'school-2' : 'school-1'
      const schoolFilters = app.filters.filter(({ args }) => ['school_id', 'student.school_id', 'id'].includes(args[0]))
      assert.equal(schoolFilters.length, 11)
      assert.ok(schoolFilters.every(({ args }) => args[1] === expectedSchool))
    })
  }
}

for (const [options, destination] of [
  [{ signedIn: false }, '/login'],
  [{ role: 'superadmin' }, '/superadmin'],
  [{ role: 'accountant' }, '/accounting'],
]) {
  test(`existing redirect to ${destination} is preserved`, async () => {
    const app = loadPage(options)
    await assert.rejects(app.page(), { message: `REDIRECT:${destination}` })
    assert.equal(app.adminCalls(), 0)
  })
}


test('thrown school lookup errors render a static fallback and log no private details', async () => {
  const app = loadPage({ schoolId: 'private-school-id', schoolThrows: true })
  const html = renderToStaticMarkup(await app.page())
  assert.match(html, /Dashboard unavailable/)
  assert.doesNotMatch(html, /private|test@example|script|http-equiv|school-id/)
  assert.deepEqual(app.logs, [['[dashboard] unavailable', { reason: 'SCHOOL_LOOKUP_THROWN', hasSchoolId: true }]])
})
