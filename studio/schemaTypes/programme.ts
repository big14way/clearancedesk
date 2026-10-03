import {defineField, defineType} from 'sanity'

export const programme = defineType({
  name: 'programme',
  title: 'Programme',
  type: 'document',
  description: 'A degree course at one institution, e.g. Computer Science at UNILAG.',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'Course name as the institution lists it.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description: 'URL-safe identifier.',
      options: {source: 'title'},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'institution',
      title: 'Institution',
      type: 'reference',
      to: [{type: 'institution'}],
      description: 'The university that offers it.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'faculty',
      title: 'Faculty',
      type: 'string',
      description: 'Faculty or college it sits in.',
    }),
    defineField({
      name: 'durationYears',
      title: 'Duration (years)',
      type: 'number',
      description: 'Normal length of the degree.',
      validation: (rule) => rule.integer().min(1).max(7),
    }),
  ],
  preview: {
    select: {title: 'title', shortName: 'institution.shortName', faculty: 'faculty'},
    prepare: ({title, shortName, faculty}) => ({title, subtitle: [shortName, faculty].filter(Boolean).join(' · ')}),
  },
})
