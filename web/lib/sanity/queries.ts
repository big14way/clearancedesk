import type {VerificationStatus} from '@/lib/eligibility/types'
import {sanity} from './client'

export type FormOptions = {
  subjects: Array<{_id: string; name: string}>
  institutions: Array<{_id: string; name: string; shortName: string; programmes: Array<{_id: string; title: string}>}>
}

/** Subjects, and the institutions and programmes that have at least one requirement. */
export function getFormOptions(): Promise<FormOptions> {
  return sanity.fetch(`{
    "subjects": *[_type == "subject"] | order(name asc){_id, name},
    "institutions": *[_type == "institution"] | order(name asc){_id, name, shortName,
      "programmes": *[_type == "programme" && institution._ref == ^._id && count(*[_type == "requirement" && references(^._id)]) > 0]
        | order(title asc){_id, title}}
  }`)
}

export type Coverage = {
  institutions: Array<{
    _id: string
    name: string
    shortName: string
    ownership?: string
    website?: string
    programmes: number
    statuses: VerificationStatus[]
  }>
  sessions: string[]
  statuses: VerificationStatus[]
  sources: {official: number; secondary: number}
  lastVerified: string | null
}

/** Live data coverage for the About page. */
export function getCoverage(): Promise<Coverage> {
  return sanity.fetch(`{
    "institutions": *[_type == "institution"] | order(name asc){_id, name, shortName, ownership, website,
      "programmes": count(*[_type == "programme" && institution._ref == ^._id]),
      "statuses": *[_type == "requirement" && programme->institution._ref == ^._id].verificationStatus},
    "sessions": array::unique(*[_type == "requirement"].session),
    "statuses": *[_type == "requirement"].verificationStatus,
    "sources": {
      "official": count(*[_type == "source" && authority == "official"]),
      "secondary": count(*[_type == "source" && authority == "secondary"])
    },
    "lastVerified": *[_type == "requirement" && defined(lastVerified)] | order(lastVerified desc)[0].lastVerified
  }`)
}
