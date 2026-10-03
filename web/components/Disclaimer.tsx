import {InfoIcon} from './icons'

export function Disclaimer() {
  return (
    <p className="flex gap-2 rounded-lg bg-stone-100 px-3 py-2 text-sm text-stone-700">
      <InfoIcon className="mt-0.5 size-4 shrink-0" />
      <span>Requirements can change. Always confirm with the university and JAMB before you apply.</span>
    </p>
  )
}
