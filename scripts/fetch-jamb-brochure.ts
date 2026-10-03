/**
 * Downloads JAMB's official brochure entries (IBASS, https://ibass.jamb.gov.ng/brochure-by-institution)
 * for the institutions we cover, and saves the raw API responses to data/raw/jamb-ibass/.
 *
 * These files are the ground truth for UTME subjects and O'level requirements in data/catalog.yaml.
 * data/raw/ is gitignored (third-party content); re-run this script to reproduce it.
 *
 *   npm run fetch:jamb
 */
import {mkdir, writeFile} from 'node:fs/promises'
import path from 'node:path'

const API = 'https://ibass-api.jamb.gov.ng/api'
const OUT = path.resolve(import.meta.dirname, '../data/raw/jamb-ibass')

// IBASS institution ids and the exact title used to look each one up via POST /ibass/institutions
const INSTITUTIONS: Record<string, {id: number; search: string}> = {
  unilag: {id: 494, search: 'UNIVERSITY OF LAGOS, LAGOS STATE'},
  ui: {id: 392, search: 'UNIVERSITY OF IBADAN, IBADAN, OYO STATE'},
  oau: {id: 620, search: 'OBAFEMI AWOLOWO UNIVERSITY, ILE-IFE, OSUN STATE'},
  unn: {id: 805, search: 'UNIVERSITY OF NIGERIA, NSUKKA, ENUGU STATE'},
  lasu: {id: 503, search: 'LAGOS STATE UNIVERSITY, OJO, LAGOS STATE'},
}

type Page<T> = {data: T[]; current_page: number; last_page: number}
type Envelope<T> = {status: boolean; message: string; data: Page<T>}

async function post<T>(url: string, body: unknown): Promise<Envelope<T>> {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {'Content-Type': 'application/json', Accept: 'application/json'},
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60_000),
      })
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
      return (await res.json()) as Envelope<T>
    } catch (err) {
      if (attempt >= 4) throw err
      console.warn(`  retry ${attempt} for ${url}: ${(err as Error).message}`)
      await new Promise((r) => setTimeout(r, 2000 * attempt))
    }
  }
}

async function fetchProgrammes(institutionId: number) {
  const all: unknown[] = []
  for (let page = 1; ; page++) {
    const env = await post<unknown>(`${API}/ibass/institution/programmes/${institutionId}?page=${page}`, {
      course_search: '',
    })
    all.push(...env.data.data)
    if (page >= env.data.last_page) return all
  }
}

async function main() {
  await mkdir(OUT, {recursive: true})
  const retrievedAt = new Date().toISOString()
  for (const [key, {id, search}] of Object.entries(INSTITUTIONS)) {
    const found = await post<{id: number}>(`${API}/ibass/institutions?page=1`, {
      inst_type: '',
      inst_category: '',
      inst_search: search,
    })
    const institution = found.data.data.find((row) => row.id === id)
    if (!institution) throw new Error(`IBASS institution ${id} not found searching "${search}"`)
    const programmes = await fetchProgrammes(id)
    const file = path.join(OUT, `${key}.json`)
    await writeFile(
      file,
      JSON.stringify(
        {
          source: `${API}/ibass/institution/programmes/${id}`,
          browse: 'https://ibass.jamb.gov.ng/brochure-by-institution',
          institutionId: id,
          retrievedAt,
          institution,
          programmes,
        },
        null,
        2,
      ),
    )
    console.log(`${key}: ${programmes.length} programmes -> ${path.relative(process.cwd(), file)}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
