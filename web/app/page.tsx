import {Checker} from '@/components/Checker'
import {getFormOptions} from '@/lib/sanity/queries'

export const revalidate = 600

export default async function Home() {
  const options = await getFormOptions()
  const schools = options.institutions.map((i) => i.shortName).join(', ').replace(/, ([^,]*)$/, ' and $1')

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h1 className="text-3xl leading-tight font-bold tracking-tight text-balance text-stone-950 sm:text-4xl">
          Will your admission survive clearance?
        </h1>
        <p className="text-lg text-pretty text-stone-700">
          Check your UTME subjects, score and O&apos;level results against the published 2026/2027 requirements for{' '}
          {schools}, before you apply.
        </p>
      </div>
      <Checker options={options} />
    </div>
  )
}
