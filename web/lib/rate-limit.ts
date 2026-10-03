// Best-effort limits shared by the API routes, held in memory per server instance.
const WINDOW_MS = 10 * 60_000
const hits = new Map<string, number[]>()
let today = {date: '', count: 0}

export function clientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
  )
}

/** Records a hit and says whether this IP is over `limit` requests in the last 10 minutes. */
export function overIpLimit(ip: string, limit = 10): boolean {
  const now = Date.now()
  if (hits.size > 5000) hits.clear()
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS)
  recent.push(now)
  hits.set(ip, recent)
  return recent.length > limit
}

export function overDailyCap(): boolean {
  const date = new Date().toISOString().slice(0, 10)
  if (today.date !== date) today = {date, count: 0}
  return today.count >= (Number(process.env.DAILY_REQUEST_CAP) || 300)
}

export function countToday(): void {
  today.count++
}
