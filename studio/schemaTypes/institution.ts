import {defineField, defineType} from 'sanity'

export const institution = defineType({
  name: 'institution',
  title: 'Institution',
  type: 'document',
  description: 'A Nigerian university that admits through JAMB.',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      description: 'Full official name.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'shortName',
      title: 'Short name',
      type: 'string',
      description: 'Common abbreviation, e.g. "UNILAG".',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description: 'URL-safe identifier.',
      options: {source: 'shortName'},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'ownership',
      title: 'Ownership',
      type: 'string',
      description: 'Who runs it.',
      options: {list: ['federal', 'state', 'private'], layout: 'radio', direction: 'horizontal'},
    }),
    defineField({
      name: 'state',
      title: 'State',
      type: 'string',
      description: 'Nigerian state where the main campus is.',
    }),
    defineField({
      name: 'website',
      title: 'Website',
      type: 'url',
      description: 'Official website.',
    }),
  ],
  preview: {
    select: {title: 'name', shortName: 'shortName', state: 'state'},
    prepare: ({title, shortName, state}) => ({title, subtitle: [shortName, state].filter(Boolean).join(' · ')}),
  },
})
