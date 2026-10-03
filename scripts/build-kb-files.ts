/**
 * data/kb-manifest.yaml + data/sources.yaml  ->  data/raw/kb/  (upload files for the Sanity Context Knowledge Base)
 *
 * - HTML pages become clean Markdown: a source header (title, URL, publisher, authority, dates) followed by the page's
 *   main text, so every Knowledge Base entry can name and link its original source.
 * - PDFs are copied as-is, or reduced to the listed pages (text, with two-column pages read column by column).
 *
 *   npm run build:kb
 */
import {copyFile, mkdir, readFile, rm, writeFile} from 'node:fs/promises'
import path from 'node:path'
import {parse as parseHtml, type HTMLElement} from 'node-html-parser'
import {getDocumentProxy} from 'unpdf'
import {parse} from 'yaml'

const ROOT = path.resolve(import.meta.dirname, '..')
const OUT = path.join(ROOT, 'data/raw/kb')

type Source = {
  id: string
  title: string
  url: string
  publisher?: string
  authority: string
  publishedAt?: string
  retrievedAt: string
  file?: string
}
type Entry = {source: string; mode: 'html' | 'pdf' | 'pdf-pages'; pages?: number[]; columns?: 1 | 2}

const header = (s: Source) =>
  [
    `# ${s.title}`,
    '',
    `- Source URL: ${s.url}`,
    `- Publisher: ${s.publisher ?? 'Unknown'}`,
    `- Authority: ${s.authority}${s.authority === 'secondary' ? ' (news/blog — not an official source)' : ' (official source)'}`,
    ...(s.publishedAt ? [`- Published: ${s.publishedAt}`] : []),
    `- Retrieved: ${s.retrievedAt}`,
    '',
    '---',
    '',
  ].join('\n')

// ---------------------------------------------------------------- HTML -> Markdown-ish text
const DROP = 'script, style, noscript, svg, nav, header, footer, aside, form, iframe, button, .sharedaddy, .comments-area, #comments, .related-posts, .widget, .sidebar, .menu'
const BLOCK = new Set(['p', 'div', 'section', 'article', 'li', 'tr', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'ul', 'ol', 'blockquote'])

function pickMain(root: HTMLElement): HTMLElement {
  const candidates = ['.entry-content', 'article', 'main', '#content', '.post-content', '.content', 'body']
  for (const sel of candidates) {
    const el = root.querySelector(sel)
    if (el && el.text.trim().length > 200) return el
  }
  return root
}

function toText(el: HTMLElement): string {
  const out: string[] = []
  const walk = (node: HTMLElement) => {
    for (const child of node.childNodes) {
      if (child.nodeType === 3) {
        out.push(child.rawText.replace(/\s+/g, ' '))
        continue
      }
      if (child.nodeType !== 1) continue
      const c = child as HTMLElement
      const tag = c.tagName?.toLowerCase() ?? ''
      if (/^h[1-6]$/.test(tag)) out.push(`\n\n${'#'.repeat(Math.min(Number(tag[1]) + 1, 6))} `)
      else if (tag === 'li') out.push('\n- ')
      else if (tag === 'td' || tag === 'th') out.push(' | ')
      else if (BLOCK.has(tag)) out.push('\n')
      walk(c)
      if (BLOCK.has(tag)) out.push('\n')
    }
  }
  walk(el)
  return out
    .join('')
    .split('\n')
    .map((l) => l.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

async function htmlToMarkdown(file: string) {
  const root = parseHtml(await readFile(file, 'utf8'), {comment: false})
  root.querySelectorAll(DROP).forEach((n) => n.remove())
  return toText(pickMain(root))
}

// ---------------------------------------------------------------- PDF pages -> text
async function pdfPagesToText(file: string, pages: number[], columns: 1 | 2) {
  const pdf = await getDocumentProxy(new Uint8Array(await readFile(file)))
  const parts: string[] = []
  for (const n of pages) {
    const page = await pdf.getPage(n)
    const width = page.getViewport({scale: 1}).width
    const items = (await page.getTextContent()).items as Array<{str: string; transform: number[]}>
    const cols = columns === 2 ? [items.filter((i) => i.transform[4] < width / 2), items.filter((i) => i.transform[4] >= width / 2)] : [items]
    const text = cols
      .map((col) => {
        // group into lines by y, top to bottom
        const lines = new Map<number, Array<{x: number; s: string}>>()
        for (const it of col) {
          const y = Math.round(it.transform[5])
          lines.set(y, [...(lines.get(y) ?? []), {x: it.transform[4], s: it.str}])
        }
        return [...lines.entries()]
          .sort((a, b) => b[0] - a[0])
          .map(([, segs]) => segs.sort((a, b) => a.x - b.x).map((s) => s.s).join(' ').replace(/\s+/g, ' ').trim())
          .filter(Boolean)
          .join('\n')
      })
      .join('\n\n')
    parts.push(`## PDF page ${n}\n\n${text}`)
  }
  return parts.join('\n\n')
}

async function main() {
  const sources = parse(await readFile(path.join(ROOT, 'data/sources.yaml'), 'utf8')) as Source[]
  const manifest = parse(await readFile(path.join(ROOT, 'data/kb-manifest.yaml'), 'utf8')) as Entry[]
  const byId = new Map(sources.map((s) => [s.id, s]))
  await rm(OUT, {recursive: true, force: true})
  await mkdir(OUT, {recursive: true})

  for (const entry of manifest) {
    const s = byId.get(entry.source)
    if (!s) throw new Error(`kb-manifest: unknown source ${entry.source}`)
    if (!s.file) throw new Error(`kb-manifest: source ${entry.source} has no local file`)
    const input = path.join(ROOT, s.file)
    const base = entry.source.replace(/^src-/, '')
    let outFile: string
    if (entry.mode === 'pdf') {
      outFile = path.join(OUT, `${base}.pdf`)
      await copyFile(input, outFile)
    } else {
      const body =
        entry.mode === 'html' ? await htmlToMarkdown(input) : await pdfPagesToText(input, entry.pages ?? [], entry.columns ?? 1)
      if (body.length < 200) throw new Error(`${entry.source}: extracted only ${body.length} chars — check the source file`)
      outFile = path.join(OUT, `${base}.md`)
      await writeFile(outFile, header(s) + body + '\n')
    }
    console.log(`${path.relative(ROOT, outFile)}`)
  }
  console.log(`✔ ${manifest.length} files in ${path.relative(ROOT, OUT)}/`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
