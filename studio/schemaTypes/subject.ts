import {defineArrayMember, defineField, defineType} from 'sanity'

export const subject = defineType({
  name: 'subject',
  title: 'Subject',
  type: 'document',
  description: 'A UTME or O\'level subject. Rules reference subjects by _id, so spelling differences never break a match.',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      description: 'Canonical name, e.g. "Mathematics".',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description: 'URL-safe identifier, e.g. "mathematics".',
      options: {source: 'name'},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'aliases',
      title: 'Aliases',
      type: 'array',
      description: 'Other names candidates and sources use, e.g. "Maths", "General Mathematics".',
      of: [defineArrayMember({type: 'string'})],
      options: {layout: 'tags'},
    }),
  ],
  preview: {
    select: {title: 'name', aliases: 'aliases'},
    prepare: ({title, aliases}) => ({title, subtitle: aliases?.join(', ')}),
  },
})
