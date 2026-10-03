import {defineField, defineType} from 'sanity'
import {gradeOptions} from '../constants'

export const gradedSubject = defineType({
  name: 'gradedSubject',
  title: 'Graded subject',
  type: 'object',
  description: "An O'level subject the candidate must pass at or above a minimum grade.",
  fields: [
    defineField({
      name: 'subject',
      title: 'Subject',
      type: 'reference',
      to: [{type: 'subject'}],
      description: 'The required subject.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'minGrade',
      title: 'Minimum grade',
      type: 'string',
      description: 'Lowest acceptable grade (A1 best, F9 worst). C6 = credit.',
      options: {list: gradeOptions},
      initialValue: 'C6',
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: {title: 'subject.name', minGrade: 'minGrade'},
    prepare: ({title, minGrade}) => ({title: title ?? 'Subject?', subtitle: `min ${minGrade ?? 'C6'}`}),
  },
})
