import {createClient} from '@sanity/client'

/** Read-only client for the public dataset. No token: nothing here can write, and nothing secret reaches the browser. */
export const sanity = createClient({
  projectId: process.env.SANITY_PROJECT_ID ?? 'cynv9mfk',
  dataset: process.env.SANITY_DATASET ?? 'production',
  apiVersion: process.env.SANITY_API_VERSION ?? '2026-09-01',
  useCdn: true,
  perspective: 'published',
})

let subjectNames: {at: number; names: Map<string, string>} | null = null

/** subject _id → display name, cached for 10 minutes per server instance. */
export async function getSubjectNames(): Promise<Map<string, string>> {
  if (subjectNames && Date.now() - subjectNames.at < 10 * 60_000) return subjectNames.names
  const rows = await sanity.fetch<Array<{_id: string; name: string}>>(`*[_type == "subject"]{_id, name}`)
  subjectNames = {at: Date.now(), names: new Map(rows.map((r) => [r._id, r.name]))}
  return subjectNames.names
}
