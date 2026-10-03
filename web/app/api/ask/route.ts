import {askRequestSchema, runAsk} from '@/lib/agent/ask'
import {clientIp, countToday, overDailyCap, overIpLimit} from '@/lib/rate-limit'

export const maxDuration = 60

export async function POST(request: Request) {
  if (overIpLimit(clientIp(request))) {
    return Response.json({error: 'Too many questions from your connection. Please wait a few minutes.'}, {status: 429})
  }
  if (overDailyCap()) {
    return Response.json({error: 'Clearance Desk has reached its limit for today. Please try again tomorrow.'}, {status: 429})
  }
  const parsed = askRequestSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return Response.json({error: 'Please ask a question of 3 to 300 characters.'}, {status: 400})
  }
  countToday()
  try {
    return Response.json(await runAsk(parsed.data, request.signal))
  } catch (error) {
    // Logged server-side only; the client never sees raw errors.
    console.error('[ask] failed:', error instanceof Error ? `${error.name}: ${error.message}` : 'unknown error')
    return Response.json({error: 'Something went wrong while looking that up. Please try again.'}, {status: 502})
  }
}
