import type {Metadata} from 'next'
import type {ReactNode} from 'react'
import type {VerificationStatus} from '@/lib/eligibility/types'
import {getCoverage} from '@/lib/sanity/queries'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'About · Clearance Desk',
  description: 'How Clearance Desk works, what data it covers, and what it cannot do.',
}

const DATASET_URL =
  'https://cynv9mfk.api.sanity.io/v2026-09-01/data/query/production?query=*%5B_type%3D%3D%22requirement%22%5D%7B_id%2Csession%2CverificationStatus%7D'
const REPO_URL = 'https://github.com/big14way/clearancedesk'

const count = (statuses: VerificationStatus[], s: VerificationStatus) => statuses.filter((x) => x === s).length

function Box({title, tag, tone, children}: {title: string; tag: string; tone: string; children: ReactNode}) {
  return (
    <div className={`rounded-xl border p-3 ${tone}`}>
      <p className="text-xs font-semibold tracking-wide uppercase opacity-80">{tag}</p>
      <p className="mt-0.5 font-semibold">{title}</p>
      <div className="mt-1 text-sm opacity-90">{children}</div>
    </div>
  )
}

const Arrow = ({label}: {label?: string}) => (
  <div className="flex items-center justify-center gap-2 py-1 text-stone-500" aria-hidden="true">
    <span className="text-lg leading-none">↓</span>
    {label && <code className="font-mono text-xs">{label}</code>}
  </div>
)

const h2 = 'text-xl font-semibold text-stone-950'
const card = 'rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6'

export default async function About() {
  const coverage = await getCoverage()
  const total = coverage.statuses.length
  const programmes = coverage.institutions.reduce((n, i) => n + i.programmes, 0)
  // Shown only when it has something to say, so the table fits a 360px screen.
  const showUnverified = count(coverage.statuses, 'unverified') > 0

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight text-stone-950">How Clearance Desk works</h1>
        <p className="text-lg text-stone-700">
          The model finds and explains. Deterministic code judges. Every rule is structured data with a source, so the agent
          can check your exact results instead of guessing from a web page.
        </p>
      </div>

      <section className={`${card} space-y-4`} aria-labelledby="arch">
        <h2 id="arch" className={h2}>
          Architecture
        </h2>
        <figure>
          <div className="mx-auto max-w-xl">
            <Box tag="Browser" title="Your details" tone="border-stone-300 bg-stone-50 text-stone-900">
              UTME subjects and score, O&apos;level sittings, and the course to check.
            </Box>
            <Arrow label="POST /api/check" />
            <Box tag="Next.js route" title="Agent loop: Claude via the Vercel AI SDK" tone="border-stone-300 bg-stone-900 text-white">
              Your results stay on the server. The model never retypes them.
            </Box>
            <Arrow />
            <div className="grid gap-2 sm:grid-cols-3">
              <Box tag="Sanity Context MCP" title="clearance-rules" tone="border-sky-200 bg-sky-50 text-sky-950">
                GROQ over the dataset: requirements, programmes, subjects, sources.
              </Box>
              <Box tag="Local code, no AI" title="evaluate_eligibility" tone="border-emerald-200 bg-emerald-50 text-emerald-950">
                Loads the requirements and checks subjects, score, credits and sittings.
              </Box>
              <Box tag="Sanity Context MCP" title="clearance-policy" tone="border-violet-200 bg-violet-50 text-violet-950">
                Knowledge Base of JAMB and university documents.
              </Box>
            </div>
            <Arrow label="submit_verdict" />
            <Box tag="Response" title="Verdict, explanation, policy notes, sources, trace" tone="border-stone-300 bg-stone-50 text-stone-900">
              The verdict always comes from the code. Claude writes the explanation around it.
            </Box>
          </div>
          <figcaption className="mt-3 text-center text-xs text-stone-600">
            One agent, two Sanity Context endpoints, one deterministic evaluator.
          </figcaption>
        </figure>
      </section>

      <section className={`${card} space-y-3`} aria-labelledby="why">
        <h2 id="why" className={h2}>
          Why two Context endpoints
        </h2>
        <p className="text-stone-800">
          A Sanity Context endpoint serves one kind of source. If a dataset and a Knowledge Base share an endpoint, the dataset
          wins and the Knowledge Base is silently ignored. So there are two:
        </p>
        <ul className="list-disc space-y-1 pl-5 text-stone-800">
          <li>
            <strong className="font-semibold">clearance-rules</strong> serves the structured dataset. These are the exact rules,
            like &ldquo;one sitting only&rdquo; or &ldquo;pick 1 of Chemistry or Biology&rdquo;. GROQ finds them.
          </li>
          <li>
            <strong className="font-semibold">clearance-policy</strong> serves a Knowledge Base built from JAMB and university
            documents. It explains why a rule matters: cut-off marks, Post-UTME screening, awaiting-result rules.
          </li>
        </ul>
        <p className="text-stone-800">
          Their tools are prefixed <code className="font-mono text-sm">rules_</code> and{' '}
          <code className="font-mono text-sm">policy_</code>, because both endpoints have tools with the same names.
        </p>
        <p className="text-stone-800">
          Why not keyword search? A search can find a page that says &ldquo;five credits at one sitting&rdquo;. It can&apos;t
          tell you that your Physics credit from a second sitting doesn&apos;t count for UNILAG Medicine. That takes the rule as
          data and code that combines your sittings.
        </p>
      </section>

      <section className={`${card} space-y-4`} aria-labelledby="coverage">
        <div>
          <h2 id="coverage" className={h2}>
            Data coverage
          </h2>
          <p className="mt-1 text-sm text-stone-600">Live from the dataset, refreshed every minute.</p>
        </div>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ['Universities', coverage.institutions.length],
            ['Programmes', programmes],
            ['Requirements', total],
            ['Sessions', coverage.sessions.join(', ')],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-stone-100 p-3">
              <dt className="text-xs font-medium text-stone-600">{label}</dt>
              <dd className="mt-0.5 text-xl font-semibold text-stone-950">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Requirements per university by verification status</caption>
            <thead>
              <tr className="border-b border-stone-200 text-xs text-stone-600">
                <th scope="col" className="py-2 pr-2 font-medium">University</th>
                <th scope="col" className="px-2 py-2 text-right font-medium">Courses</th>
                <th scope="col" className="px-2 py-2 text-right font-medium">Verified</th>
                <th scope="col" className="py-2 pl-2 text-right font-medium">Conflicting</th>
                {showUnverified && <th scope="col" className="py-2 pl-2 text-right font-medium">Unverified</th>}
              </tr>
            </thead>
            <tbody>
              {coverage.institutions.map((i) => (
                <tr key={i._id} className="border-b border-stone-100">
                  <th scope="row" className="py-2 pr-2 font-medium text-stone-900">
                    {i.shortName}
                    <span className="hidden text-xs font-normal text-stone-600 sm:block">{i.name}</span>
                  </th>
                  <td className="px-2 py-2 text-right tabular-nums">{i.programmes}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{count(i.statuses, 'verified')}</td>
                  <td className="py-2 pl-2 text-right tabular-nums">{count(i.statuses, 'conflicting')}</td>
                  {showUnverified && <td className="py-2 pl-2 text-right tabular-nums">{count(i.statuses, 'unverified')}</td>}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-semibold text-stone-950">
                <th scope="row" className="py-2 pr-2">All</th>
                <td className="px-2 py-2 text-right tabular-nums">{programmes}</td>
                <td className="px-2 py-2 text-right tabular-nums">{count(coverage.statuses, 'verified')}</td>
                <td className="py-2 pl-2 text-right tabular-nums">{count(coverage.statuses, 'conflicting')}</td>
                {showUnverified && (
                  <td className="py-2 pl-2 text-right tabular-nums">{count(coverage.statuses, 'unverified')}</td>
                )}
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="text-sm text-stone-700">
          <strong className="font-medium">Verified</strong> means every field was checked against its cited sources.{' '}
          <strong className="font-medium">Conflicting</strong> means official sources disagree. The stricter rule is stored, and
          the result says what differs.{!showUnverified && ' No requirement is unverified.'} The data rests on {coverage.sources.official} official sources and{' '}
          {coverage.sources.secondary} secondary ones (news sites and blogs, used only for context).
          {coverage.lastVerified && <> It was last checked on {coverage.lastVerified}.</>}
        </p>
      </section>

      <section className={`${card} space-y-3`} aria-labelledby="limits">
        <h2 id="limits" className={h2}>
          Limitations
        </h2>
        <ul className="list-disc space-y-1.5 pl-5 text-stone-800">
          <li>
            Covers {coverage.institutions.length} universities and {programmes} programmes for the{' '}
            {coverage.sessions.join(', ')} session only. A course that isn&apos;t in the data gets a plain &ldquo;no data&rdquo;
            answer, never a guess.
          </li>
          <li>
            UTME entry only. Direct Entry, Post-UTME scores, aggregate scores and catchment quotas are not calculated. Meeting
            the minimum does not guarantee admission.
          </li>
          <li>
            When official sources disagree, the stricter rule is used, so the result is &ldquo;At risk&rdquo; even if your
            results fit. UI publishes no UTME minimum, so a UI course can never come out plain &ldquo;Eligible&rdquo;.
          </li>
          <li>
            Some conditions can&apos;t be checked from your results, like age, first choice and upload deadlines. These are
            listed under &ldquo;Also check these yourself&rdquo;. Cambridge O&apos;Level and other exams are not modelled.
          </li>
          <li>
            The verdict comes from code, but the explanation is written by an AI model and can occasionally add advice that
            no source states. Trust the checks and the linked sources over the wording.
          </li>
          <li>Rate limits apply: about 10 checks per connection every 10 minutes.</li>
        </ul>
      </section>

      <section className={`${card} space-y-2`} aria-labelledby="links">
        <h2 id="links" className={h2}>
          Links
        </h2>
        <ul className="space-y-1.5 text-stone-800">
          <li>
            <a className="text-emerald-800 underline underline-offset-2 hover:text-emerald-950" href={REPO_URL}>
              Source code on GitHub
            </a>{' '}
            (schema, data pipeline, evaluator, agent and build log)
          </li>
          <li>
            <a className="text-emerald-800 underline underline-offset-2 hover:text-emerald-950" href={DATASET_URL}>
              Public dataset query
            </a>{' '}
            (every requirement, no login: Sanity project <code className="font-mono text-sm">cynv9mfk</code>)
          </li>
        </ul>
      </section>
    </div>
  )
}
