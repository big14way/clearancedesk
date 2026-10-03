import {defineArrayMember, defineField, defineType} from 'sanity'
import {examOptions, verificationOptions} from './constants'

const subjectRef = defineArrayMember({type: 'reference', to: [{type: 'subject'}]})

/**
 * One programme's admission rules for one session. Every rule is data so the
 * evaluator can check a candidate deterministically, and every rule cites the
 * source it came from.
 */
export const requirement = defineType({
  name: 'requirement',
  title: 'Requirement',
  type: 'document',
  description: "Admission rules for one programme in one session: UTME subjects and score, O'level credits and sittings.",
  groups: [
    {name: 'utme', title: 'UTME'},
    {name: 'olevel', title: "O'level"},
    {name: 'trust', title: 'Sources & verification'},
  ],
  fields: [
    defineField({
      name: 'programme',
      title: 'Programme',
      type: 'reference',
      to: [{type: 'programme'}],
      description: 'The course these rules apply to. The institution comes from the programme.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'session',
      title: 'Session',
      type: 'string',
      description: 'Admission session, e.g. "2026/2027".',
      validation: (rule) => rule.required().regex(/^\d{4}\/\d{4}$/, {name: 'YYYY/YYYY'}),
    }),

    // UTME
    defineField({
      name: 'utmeCompulsory',
      title: 'UTME compulsory subjects',
      type: 'array',
      group: 'utme',
      description: 'Subjects the candidate must have sat in UTME, including Use of English.',
      of: [subjectRef],
      validation: (rule) => rule.unique(),
    }),
    defineField({
      name: 'utmeChoices',
      title: 'UTME choice groups',
      type: 'array',
      group: 'utme',
      description: 'Remaining UTME subjects as "pick N from" groups, satisfied in order with subjects not already used.',
      of: [defineArrayMember({type: 'subjectChoice'})],
    }),
    defineField({
      name: 'utmeMinScore',
      title: 'UTME minimum score',
      type: 'number',
      group: 'utme',
      description: "The institution's published minimum UTME score for this session. Leave empty if no source states it.",
      validation: (rule) => rule.integer().min(0).max(400),
    }),
    defineField({
      name: 'lastCutoff',
      title: 'Last departmental cut-off',
      type: 'object',
      group: 'utme',
      description: 'Most recent published cut-off for this course. A guide, not a guarantee. Leave empty if not published.',
      options: {collapsible: true, collapsed: false},
      fields: [
        defineField({
          name: 'score',
          title: 'Score',
          type: 'number',
          description: 'Cut-off mark (UTME or aggregate, as the source states).',
          validation: (rule) => rule.min(0).max(400),
        }),
        defineField({
          name: 'session',
          title: 'Session',
          type: 'string',
          description: 'Session the cut-off was published for, e.g. "2025/2026".',
          validation: (rule) => rule.regex(/^\d{4}\/\d{4}$/, {name: 'YYYY/YYYY'}),
        }),
      ],
      validation: (rule) =>
        rule.custom((value) => {
          if (!value) return true
          const hasScore = typeof value.score === 'number'
          return hasScore === Boolean(value.session) || 'Give both the score and its session, or neither'
        }),
    }),

    // O'level
    defineField({
      name: 'olevelMinCredits',
      title: "Minimum O'level credits",
      type: 'number',
      group: 'olevel',
      description: 'Total credit passes (C6 or better) needed, usually 5.',
      initialValue: 5,
      validation: (rule) => rule.required().integer().min(1).max(9),
    }),
    defineField({
      name: 'olevelCompulsory',
      title: "O'level compulsory subjects",
      type: 'array',
      group: 'olevel',
      description: 'Subjects that must be passed at or above a minimum grade, e.g. English and Mathematics at C6.',
      of: [defineArrayMember({type: 'gradedSubject'})],
    }),
    defineField({
      name: 'olevelChoices',
      title: "O'level choice groups",
      type: 'array',
      group: 'olevel',
      description: '"Pick N from" groups for the remaining credits. Each subject counts once across all rules.',
      of: [defineArrayMember({type: 'subjectChoice'})],
    }),
    defineField({
      name: 'olevelOtherSubjectsCount',
      title: 'Other credits count toward the minimum',
      type: 'boolean',
      group: 'olevel',
      description: 'On if the source says "any other" credit counts toward the minimum total.',
      initialValue: false,
    }),
    defineField({
      name: 'olevelMaxSittings',
      title: "Maximum O'level sittings",
      type: 'number',
      group: 'olevel',
      description: 'How many exam sittings results may be combined from. A sitting is one exam (e.g. WAEC May/June 2025).',
      options: {list: [1, 2], layout: 'radio', direction: 'horizontal'},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'olevelAcceptedExams',
      title: "Accepted O'level exams",
      type: 'array',
      group: 'olevel',
      description: 'Exam bodies whose results are accepted.',
      of: [defineArrayMember({type: 'string'})],
      options: {list: examOptions, layout: 'grid'},
      validation: (rule) => rule.required().min(1).unique(),
    }),
    defineField({
      name: 'specialConditions',
      title: 'Special conditions',
      type: 'array',
      description: 'Conditions code cannot check, e.g. "Post-UTME screening required". Shown as manual checks.',
      of: [defineArrayMember({type: 'string'})],
    }),

    // Trust
    defineField({
      name: 'citations',
      title: 'Citations',
      type: 'array',
      group: 'trust',
      description: 'Where these rules were published. At least one, with a precise locator.',
      of: [defineArrayMember({type: 'citation'})],
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: 'verificationStatus',
      title: 'Verification status',
      type: 'string',
      group: 'trust',
      description: 'Verified = checked by a human against the source. Conflicting = official sources disagree; the stricter rule is encoded.',
      options: {list: verificationOptions, layout: 'radio', direction: 'horizontal'},
      initialValue: 'unverified',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'conflictNote',
      title: 'Conflict note',
      type: 'text',
      rows: 3,
      group: 'trust',
      description: 'Which sources disagree and how. Required when the status is "conflicting".',
      hidden: ({document}) => document?.verificationStatus !== 'conflicting' && !document?.conflictNote,
    }),
    defineField({
      name: 'lastVerified',
      title: 'Last verified',
      type: 'date',
      group: 'trust',
      description: 'When a human last checked these rules against the sources.',
    }),
  ],
  validation: (rule) =>
    rule.custom((doc) => {
      if (!doc) return true
      const compulsory = (doc.utmeCompulsory as unknown[] | undefined)?.length ?? 0
      const choices = (doc.utmeChoices as Array<{pick?: number}> | undefined) ?? []
      const total = compulsory + choices.reduce((sum, c) => sum + (c.pick ?? 0), 0)
      if (total !== 4) {
        return {
          message: `UTME is exactly 4 subjects: compulsory (${compulsory}) + choice picks (${total - compulsory}) = ${total}`,
          path: ['utmeCompulsory'],
        }
      }
      if (doc.verificationStatus === 'conflicting' && !doc.conflictNote) {
        return {message: 'Explain the conflict when the status is "conflicting"', path: ['conflictNote']}
      }
      return true
    }),
  orderings: [
    {
      title: 'Session, newest first',
      name: 'sessionDesc',
      by: [{field: 'session', direction: 'desc'}],
    },
  ],
  preview: {
    select: {
      title: 'programme.title',
      shortName: 'programme.institution.shortName',
      session: 'session',
      status: 'verificationStatus',
    },
    prepare: ({title, shortName, session, status}) => ({
      title: title ?? 'No programme',
      subtitle: [shortName, session, status].filter(Boolean).join(' · '),
    }),
  },
})
