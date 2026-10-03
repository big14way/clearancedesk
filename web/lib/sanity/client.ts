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

export type SourceRef = {title: string; url?: string; authority?: 'official' | 'secondary'}

let sourceIndex: {at: number; byUrl: Map<string, SourceRef>; byId: Map<string, SourceRef>} | null = null

const urlKey = (url: string) => url.trim().replace(/^https?:\/\/(www\.)?/, '').replace(/\/+$/, '').toLowerCase()

/**
 * Finds one of our source documents from what a policy note cites: its URL, or the Knowledge Base upload file name
 * (scripts/build-kb-files.ts names each file after its source id, e.g. "lasu-2026-screening-reopening.md").
 */
export async function getSourceLookup(): Promise<(cited: {url?: string | null; title?: string | null}) => SourceRef | undefined> {
  if (!sourceIndex || Date.now() - sourceIndex.at > 10 * 60_000) {
    const rows = await sanity.fetch<Array<SourceRef & {_id: string}>>(`*[_type == "source"]{_id, title, url, authority}`)
    sourceIndex = {
      at: Date.now(),
      byUrl: new Map(rows.filter((r) => r.url).map((r) => [urlKey(r.url!), r])),
      byId: new Map(rows.map((r) => [r._id, r])),
    }
  }
  const {byUrl, byId} = sourceIndex
  return ({url, title}) => {
    if (url) {
      const hit = byUrl.get(urlKey(url))
      if (hit) return hit
    }
    const file = title?.trim().match(/^([a-z0-9-]+)\.(md|pdf)\b/i)?.[1]
    return file ? byId.get(`source-src-${file.toLowerCase()}`) : undefined
  }
}
