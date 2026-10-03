import {checkRequestSchema, runCheck} from '@/lib/agent/run'

export const maxDuration = 60

// Best-effort limits, held in memory per server instance.
const WINDOW_MS = 10 * 60_000
const PER_IP_PER_WINDOW = 10
const hits = new Map<string, number[]>()
let today = {date: '', count: 0}

function clientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
  )
}

function overIpLimit(ip: string): boolean {
  const now = Date.now()
  if (hits.size > 5000) hits.clear()
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS)
  recent.push(now)
  hits.set(ip, recent)
  return recent.length > PER_IP_PER_WINDOW
}

function overDailyCap(): boolean {
  const date = new Date().toISOString().slice(0, 10)
  if (today.date !== date) today = {date, count: 0}
  return today.count >= (Number(process.env.DAILY_REQUEST_CAP) || 300)
}

export async function POST(request: Request) {
  if (overIpLimit(clientIp(request))) {
    return Response.json({error: 'Too many checks from your connection. Please wait a few minutes.'}, {status: 429})
  }
  if (overDailyCap()) {
    return Response.json({error: 'Clearance Desk has reached its limit for today. Please try again tomorrow.'}, {status: 429})
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({error: 'The request body must be JSON.'}, {status: 400})
  }
  const parsed = checkRequestSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      {
        error: 'Some of the details are missing or invalid.',
        issues: parsed.error.issues.map((i) => ({path: i.path.join('.'), message: i.message})),
      },
      {status: 400},
    )
  }

  today.count++
  try {
    return Response.json(await runCheck(parsed.data, request.signal))
  } catch (error) {
    // Logged server-side only; the client never sees raw errors.
    console.error('[check] failed:', error instanceof Error ? `${error.name}: ${error.message}` : 'unknown error')
    return Response.json({error: 'Something went wrong while checking. Please try again.'}, {status: 502})
  }
}
