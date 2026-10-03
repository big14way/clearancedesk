// Best-effort limits shared by the API routes, held in memory per server instance.
const WINDOW_MS = 10 * 60_000
const hits = new Map<string, number[]>()
let today = {date: '', count: 0}

export function clientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
  )
}

/**
 * Says whether this IP already made `limit` accepted requests in the last 10 minutes, and records the request if not.
 * Rejected requests don't count: otherwise retrying while limited keeps extending the lockout (the eval hit this).
 */
export function overIpLimit(ip: string, limit = 10): boolean {
  const now = Date.now()
  if (hits.size > 5000) hits.clear()
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS)
  if (recent.length >= limit) {
    hits.set(ip, recent)
    return true
  }
  recent.push(now)
  hits.set(ip, recent)
  return false
}

export function overDailyCap(): boolean {
  const date = new Date().toISOString().slice(0, 10)
  if (today.date !== date) today = {date, count: 0}
  return today.count >= (Number(process.env.DAILY_REQUEST_CAP) || 300)
}

export function countToday(): void {
  today.count++
}
