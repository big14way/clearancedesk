import {checkRequestSchema, runCheck} from '@/lib/agent/run'
import {clientIp, countToday, overDailyCap, overIpLimit} from '@/lib/rate-limit'

export const maxDuration = 60

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

  countToday()
  const failed = (error: unknown) => {
    // Logged server-side only; the client never sees raw errors.
    console.error('[check] failed:', error instanceof Error ? `${error.name}: ${error.message}` : 'unknown error')
    return {error: 'Something went wrong while checking. Please try again.'}
  }

  // The app asks for NDJSON: each Sanity Context step as it finishes, the verdicts as soon as the code decides them,
  // then the full response. Anyone else (the eval, curl) gets one JSON body.
  if (request.headers.get('accept')?.includes('application/x-ndjson')) {
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: object) => {
          try {
            controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'))
          } catch {
            // the client went away; the run still finishes and is logged
          }
        }
        try {
          send({type: 'done', response: await runCheck(parsed.data, request.signal, send)})
        } catch (error) {
          send({type: 'error', ...failed(error)})
        }
        controller.close()
      },
    })
    return new Response(stream, {
      headers: {'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-cache, no-transform'},
    })
  }

  try {
    return Response.json(await runCheck(parsed.data, request.signal))
  } catch (error) {
    return Response.json(failed(error), {status: 502})
  }
}
