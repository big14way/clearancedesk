/**
 * data/catalog.yaml + data/sources.yaml  ->  data/seed.ndjson
 *
 * Generates Sanity documents (_id, _type, references, array _keys) and refuses to write
 * the file if any check fails: unresolved refs, unknown grades/exams, UTME subjects not
 * adding up to 4, requirements without citations, conflicting without a note, ids with dots.
 *
 *   npm run build:seed
 */
import {createHash} from 'node:crypto'
import {readFile, writeFile} from 'node:fs/promises'
import path from 'node:path'
import {parse} from 'yaml'

const ROOT = path.resolve(import.meta.dirname, '..')
const GRADES = ['A1', 'B2', 'B3', 'C4', 'C5', 'C6', 'D7', 'E8', 'F9']
const EXAMS = ['WAEC', 'NECO', 'NABTEB', 'GCE']
const VERIFICATION = ['verified', 'unverified', 'conflicting']
const PUBLISHERS = ['JAMB', 'University', 'NUC', 'Exam body', 'News/Blog', 'Other']
const SESSION = /^\d{4}\/\d{4}$/
const DATE = /^\d{4}-\d{2}-\d{2}$/

// ---------- input shapes (data/*.yaml) ----------
type SourceIn = {
  id: string
  title: string
  url: string
  publisher?: string
  authority: 'official' | 'secondary'
  publishedAt?: string | null
  retrievedAt: string
  file?: string
  notes?: string
}
type SubjectIn = {id: string; name: string; aliases?: string[]}
type InstitutionIn = {
  id: string
  name: string
  shortName: string
  ownership?: 'federal' | 'state' | 'private'
  state?: string
  website?: string
}
type ProgrammeIn = {id: string; institution: string; title: string; faculty?: string; durationYears?: number}
type ChoiceIn = {pick: number; from: string[]; minGrade?: string}
type RequirementIn = {
  id: string
  programme: string
  session: string
  utmeCompulsory: string[]
  utmeChoices?: ChoiceIn[]
  utmeMinScore: number | null
  lastCutoff: {score: number; session: string} | null
  olevelMinCredits: number
  olevelMinCreditsCombined?: number | null
  olevelCompulsory: Array<{subject: string; minGrade?: string}>
  olevelChoices?: ChoiceIn[]
  olevelOtherSubjectsCount: boolean
  olevelMaxSittings: number
  olevelAcceptedExams: string[]
  /** May contain nested lists from YAML anchors (shared per-institution conditions); flattened on build. */
  specialConditions?: Array<string | string[]>
  citations: Array<{source: string; locator: string}>
  verificationStatus: string
  conflictNote?: string | null
  lastVerified?: string | null
}
type Catalog = {
  subjects: SubjectIn[]
  institutions: InstitutionIn[]
  programmes: ProgrammeIn[]
  requirements: RequirementIn[]
}

// ---------- helpers ----------
const errors: string[] = []
const fail = (where: string, msg: string) => errors.push(`${where}: ${msg}`)

const docId = (type: string, id: string) => `${type}-${id}`
const ref = (type: string, id: string) => ({_type: 'reference', _ref: docId(type, id)})
/** Stable array keys so re-imports don't churn. */
const key = (...parts: unknown[]) =>
  createHash('sha1').update(JSON.stringify(parts)).digest('hex').slice(0, 12)

function checkId(where: string, id: string) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) fail(where, `id "${id}" must be lowercase letters, digits and hyphens (no dots)`)
}
function checkGrade(where: string, grade: string | undefined) {
  if (grade !== undefined && !GRADES.includes(grade)) fail(where, `unknown grade "${grade}"`)
}
function uniqueIds<T extends {id: string}>(label: string, items: T[]) {
  const seen = new Set<string>()
  for (const it of items) {
    checkId(`${label} ${it.id}`, it.id)
    if (seen.has(it.id)) fail(label, `duplicate id "${it.id}"`)
    seen.add(it.id)
  }
  return seen
}

async function main() {
  const catalog = parse(await readFile(path.join(ROOT, 'data/catalog.yaml'), 'utf8')) as Catalog
  const sources = parse(await readFile(path.join(ROOT, 'data/sources.yaml'), 'utf8')) as SourceIn[]

  const sourceIds = uniqueIds('source', sources)
  const subjectIds = uniqueIds('subject', catalog.subjects)
  const institutionIds = uniqueIds('institution', catalog.institutions)
  const programmeIds = uniqueIds('programme', catalog.programmes)
  uniqueIds('requirement', catalog.requirements)

  const subjectRef = (where: string, id: string) => {
    if (!subjectIds.has(id)) fail(where, `unknown subject "${id}"`)
    return {_key: key(where, id), ...ref('subject', id)}
  }
  const choices = (where: string, groups: ChoiceIn[] | undefined) =>
    (groups ?? []).map((g, i) => {
      const w = `${where}[${i}]`
      if (!Number.isInteger(g.pick) || g.pick < 1) fail(w, 'pick must be an integer ≥ 1')
      if (!g.from?.length) fail(w, 'from must list at least one subject')
      if (new Set(g.from).size !== g.from.length) fail(w, 'from lists a subject twice')
      if (g.pick > g.from.length) fail(w, `pick ${g.pick} > ${g.from.length} subjects`)
      checkGrade(w, g.minGrade)
      return {
        _key: key(w, g),
        _type: 'subjectChoice',
        pick: g.pick,
        from: g.from.map((s) => subjectRef(w, s)),
        ...(g.minGrade ? {minGrade: g.minGrade} : {}),
      }
    })

  const docs: Record<string, unknown>[] = []

  for (const s of sources) {
    const w = `source ${s.id}`
    if (!s.title) fail(w, 'title required')
    if (!/^https?:\/\//.test(s.url ?? '')) fail(w, 'url must be http(s)')
    if (!['official', 'secondary'].includes(s.authority)) fail(w, 'authority must be official|secondary')
    if (s.publisher && !PUBLISHERS.includes(s.publisher)) fail(w, `unknown publisher "${s.publisher}"`)
    if (!DATE.test(s.retrievedAt ?? '')) fail(w, 'retrievedAt must be YYYY-MM-DD')
    if (s.publishedAt && !DATE.test(s.publishedAt)) fail(w, 'publishedAt must be YYYY-MM-DD')
    docs.push({
      _id: docId('source', s.id),
      _type: 'source',
      title: s.title,
      url: s.url,
      ...(s.publisher ? {publisher: s.publisher} : {}),
      authority: s.authority,
      ...(s.publishedAt ? {publishedAt: s.publishedAt} : {}),
      retrievedAt: s.retrievedAt,
      ...(s.notes ? {notes: s.notes.trim()} : {}),
    })
  }

  for (const s of catalog.subjects) {
    docs.push({
      _id: docId('subject', s.id),
      _type: 'subject',
      name: s.name,
      slug: {_type: 'slug', current: s.id},
      aliases: s.aliases ?? [],
    })
  }

  for (const i of catalog.institutions) {
    docs.push({
      _id: docId('institution', i.id),
      _type: 'institution',
      name: i.name,
      shortName: i.shortName,
      slug: {_type: 'slug', current: i.id},
      ...(i.ownership ? {ownership: i.ownership} : {}),
      ...(i.state ? {state: i.state} : {}),
      ...(i.website ? {website: i.website} : {}),
    })
  }

  for (const p of catalog.programmes) {
    if (!institutionIds.has(p.institution)) fail(`programme ${p.id}`, `unknown institution "${p.institution}"`)
    docs.push({
      _id: docId('programme', p.id),
      _type: 'programme',
      title: p.title,
      slug: {_type: 'slug', current: p.id},
      institution: ref('institution', p.institution),
      ...(p.faculty ? {faculty: p.faculty} : {}),
      ...(p.durationYears ? {durationYears: p.durationYears} : {}),
    })
  }

  for (const r of catalog.requirements) {
    const w = `requirement ${r.id}`
    if (!programmeIds.has(r.programme)) fail(w, `unknown programme "${r.programme}"`)
    if (!SESSION.test(r.session ?? '')) fail(w, `session "${r.session}" must be YYYY/YYYY`)

    const utmeTotal = (r.utmeCompulsory?.length ?? 0) + (r.utmeChoices ?? []).reduce((n, c) => n + c.pick, 0)
    if (utmeTotal !== 4) fail(w, `UTME compulsory + choice picks = ${utmeTotal}, must be 4`)
    const compulsorySet = new Set(r.utmeCompulsory ?? [])
    for (const c of r.utmeChoices ?? [])
      for (const s of c.from)
        if (compulsorySet.has(s)) fail(w, `UTME subject "${s}" is both compulsory and in a choice group`)

    if (r.utmeMinScore !== null && (!Number.isInteger(r.utmeMinScore) || r.utmeMinScore < 0 || r.utmeMinScore > 400))
      fail(w, 'utmeMinScore must be null or an integer 0–400')
    if (r.lastCutoff !== null && (typeof r.lastCutoff?.score !== 'number' || !SESSION.test(r.lastCutoff?.session ?? '')))
      fail(w, 'lastCutoff must be null or {score, session}')

    if (!Number.isInteger(r.olevelMinCredits) || r.olevelMinCredits < 1 || r.olevelMinCredits > 9)
      fail(w, 'olevelMinCredits must be 1–9')
    if (r.olevelMinCreditsCombined != null && (!Number.isInteger(r.olevelMinCreditsCombined) || r.olevelMinCreditsCombined < r.olevelMinCredits))
      fail(w, 'olevelMinCreditsCombined must be an integer ≥ olevelMinCredits')
    if (r.olevelMinCreditsCombined != null && r.olevelMaxSittings < 2)
      fail(w, 'olevelMinCreditsCombined only makes sense when olevelMaxSittings is 2')
    const olevelCompulsory = new Set(r.olevelCompulsory.map((g) => g.subject))
    for (const c of r.olevelChoices ?? [])
      for (const s of c.from)
        if (olevelCompulsory.has(s)) fail(w, `O'level subject "${s}" is both compulsory and in a choice group`)
    if (![1, 2].includes(r.olevelMaxSittings)) fail(w, 'olevelMaxSittings must be 1 or 2')
    if (!r.olevelAcceptedExams?.length) fail(w, 'olevelAcceptedExams must list at least one exam')
    for (const e of r.olevelAcceptedExams ?? []) if (!EXAMS.includes(e)) fail(w, `unknown exam "${e}"`)

    if (!r.citations?.length) fail(w, 'needs at least one citation')
    for (const c of r.citations ?? []) {
      if (!sourceIds.has(c.source)) fail(w, `unknown source "${c.source}"`)
      if (!c.locator?.trim()) fail(w, `citation to ${c.source} has no locator`)
    }
    if (!VERIFICATION.includes(r.verificationStatus)) fail(w, `verificationStatus "${r.verificationStatus}"`)
    if (r.verificationStatus === 'conflicting' && !r.conflictNote?.trim()) fail(w, 'conflicting needs a conflictNote')
    if (r.verificationStatus === 'verified' && !r.lastVerified) fail(w, 'verified needs lastVerified')
    if (r.lastVerified && !DATE.test(r.lastVerified)) fail(w, 'lastVerified must be YYYY-MM-DD')

    docs.push({
      _id: docId('requirement', r.id),
      _type: 'requirement',
      programme: ref('programme', r.programme),
      session: r.session,
      utmeCompulsory: (r.utmeCompulsory ?? []).map((s) => subjectRef(`${w}.utmeCompulsory`, s)),
      utmeChoices: choices(`${w}.utmeChoices`, r.utmeChoices),
      utmeMinScore: r.utmeMinScore,
      lastCutoff: r.lastCutoff,
      olevelMinCredits: r.olevelMinCredits,
      ...(r.olevelMinCreditsCombined != null ? {olevelMinCreditsCombined: r.olevelMinCreditsCombined} : {}),
      olevelCompulsory: r.olevelCompulsory.map((g, i) => {
        const minGrade = g.minGrade ?? 'C6'
        checkGrade(`${w}.olevelCompulsory[${i}]`, minGrade)
        if (!subjectIds.has(g.subject)) fail(w, `unknown subject "${g.subject}"`)
        return {
          _key: key(w, 'olevelCompulsory', i, g),
          _type: 'gradedSubject',
          subject: ref('subject', g.subject),
          minGrade,
        }
      }),
      olevelChoices: choices(`${w}.olevelChoices`, r.olevelChoices),
      olevelOtherSubjectsCount: r.olevelOtherSubjectsCount,
      olevelMaxSittings: r.olevelMaxSittings,
      olevelAcceptedExams: r.olevelAcceptedExams,
      specialConditions: (r.specialConditions ?? []).flat(),
      citations: r.citations.map((c, i) => ({
        _key: key(w, 'citation', i, c),
        _type: 'citation',
        source: ref('source', c.source),
        locator: c.locator.trim(),
      })),
      verificationStatus: r.verificationStatus,
      ...(r.conflictNote ? {conflictNote: r.conflictNote.trim()} : {}),
      ...(r.lastVerified ? {lastVerified: r.lastVerified} : {}),
    })
  }

  if (errors.length) {
    console.error(`✖ ${errors.length} problem(s); seed.ndjson NOT written:\n  - ${errors.join('\n  - ')}`)
    process.exit(1)
  }

  const out = path.join(ROOT, 'data/seed.ndjson')
  await writeFile(out, docs.map((d) => JSON.stringify(d)).join('\n') + '\n')
  const count = (t: string) => docs.filter((d) => d._type === t).length
  console.log(
    `✔ wrote ${docs.length} docs to data/seed.ndjson — ` +
      ['source', 'subject', 'institution', 'programme', 'requirement'].map((t) => `${count(t)} ${t}`).join(', '),
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
