import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveEffectiveRole } from '@/lib/school'

type RateLimitEntry = { count: number; resetAt: number }
const rateLimitMap = new Map<string, RateLimitEntry>()
const LIMIT = 20
const WINDOW_MS = 60 * 60 * 1000 // 1 hour

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(userId)
  if (!entry || now >= entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }
  if (entry.count >= LIMIT) return true
  entry.count++
  return false
}

function extractText(response: Anthropic.Messages.Message): string {
  return response.content
    .flatMap((b) => (b.type === 'text' ? [b.text] : []))
    .join('')
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()
}

type PageInfo = {
  id: string
  label: string
  description?: string
  href: string
  keywords?: string[]
}

type AiSuggestion = {
  id: string
  href: string
  label: string
  reason: string
}

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'Not configured' }, { status: 503 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  const effectiveRole = await resolveEffectiveRole(roleData?.role ?? '')

  if (!['teacher', 'admin'].includes(effectiveRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (checkRateLimit(user.id)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  let body: { query: string; pages: PageInfo[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { query, pages } = body

  if (!query || typeof query !== 'string' || query.length < 10 || !query.includes(' ')) {
    return NextResponse.json({ error: 'Invalid query' }, { status: 400 })
  }

  if (!Array.isArray(pages) || pages.length === 0) {
    return NextResponse.json({ suggestion: null })
  }

  const pageList = pages
    .map(
      (p) =>
        `- id="${p.id}" href="${p.href}" label="${p.label}"${p.description ? ` — ${p.description}` : ''}${p.keywords?.length ? ` [${p.keywords.join(', ')}]` : ''}`
    )
    .join('\n')

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system:
        "You are a navigation assistant for a school management app. Given the user's question, return the single best matching page as JSON: { id, href, label, reason }. Only return JSON, nothing else. If nothing matches, return null.",
      messages: [
        {
          role: 'user',
          content: `User query: "${query}"\n\nAvailable pages:\n${pageList}`,
        },
      ],
    })

    const text = extractText(response)

    if (!text || text === 'null') {
      return NextResponse.json({ suggestion: null })
    }

    const parsed = JSON.parse(text) as Partial<AiSuggestion>

    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof parsed.id !== 'string' ||
      typeof parsed.href !== 'string' ||
      typeof parsed.label !== 'string' ||
      typeof parsed.reason !== 'string'
    ) {
      return NextResponse.json({ suggestion: null })
    }

    // Validate href is one of the pages we sent (prevents prompt injection navigation)
    const validHrefs = new Set(pages.map((p) => p.href))
    if (!validHrefs.has(parsed.href)) {
      return NextResponse.json({ suggestion: null })
    }

    return NextResponse.json({
      suggestion: {
        id: parsed.id,
        href: parsed.href,
        label: parsed.label,
        reason: parsed.reason.slice(0, 200),
      } satisfies AiSuggestion,
    })
  } catch (error) {
    console.error('[command-ai]', error)
    return NextResponse.json({ error: 'AI error' }, { status: 500 })
  }
}
