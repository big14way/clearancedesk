import {defineArrayMember, defineField, defineType} from 'sanity'
import {gradeOptions} from '../constants'

export const subjectChoice = defineType({
  name: 'subjectChoice',
  title: 'Subject choice group',
  type: 'object',
  description: '"Pick N of these subjects". Each subject can satisfy only one rule.',
  fields: [
    defineField({
      name: 'pick',
      title: 'Pick',
      type: 'number',
      description: 'How many distinct subjects from the list the candidate needs.',
      validation: (rule) => rule.required().integer().min(1),
    }),
    defineField({
      name: 'from',
      title: 'From',
      type: 'array',
      description: 'The subjects the candidate may choose from.',
      of: [defineArrayMember({type: 'reference', to: [{type: 'subject'}]})],
      validation: (rule) => rule.required().min(1).unique(),
    }),
    defineField({
      name: 'minGrade',
      title: 'Minimum grade',
      type: 'string',
      description: "O'level only. Lowest acceptable grade; leave empty for UTME choices (treated as C6 for O'level).",
      options: {list: gradeOptions},
    }),
  ],
  validation: (rule) =>
    rule.custom((value: {pick?: number; from?: unknown[]} | undefined) => {
      if (!value?.pick || !value.from) return true
      return value.pick <= value.from.length || `Pick (${value.pick}) is more than the ${value.from.length} subjects listed`
    }),
  preview: {
    select: {pick: 'pick', s0: 'from.0.name', s1: 'from.1.name', s2: 'from.2.name', s3: 'from.3.name', minGrade: 'minGrade'},
    prepare: ({pick, s0, s1, s2, s3, minGrade}) => {
      const names = [s0, s1, s2].filter(Boolean).join(', ') + (s3 ? ', …' : '')
      return {title: `Pick ${pick ?? '?'} from: ${names || '—'}`, subtitle: minGrade ? `min ${minGrade}` : undefined}
    },
  },
})
