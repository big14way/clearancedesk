import {defineField, defineType} from 'sanity'

export const source = defineType({
  name: 'source',
  title: 'Source',
  type: 'document',
  description: 'A published document or page that admission rules are taken from. Every requirement cites at least one.',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'Name of the document as published, e.g. "JAMBulletin, 12 May 2026".',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'url',
      title: 'URL',
      type: 'url',
      description: 'Where anyone can read the original.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'publisher',
      title: 'Publisher',
      type: 'string',
      description: 'Who published it.',
      options: {
        list: ['JAMB', 'University', 'NUC', 'Exam body', 'News/Blog', 'Other'],
      },
    }),
    defineField({
      name: 'authority',
      title: 'Authority',
      type: 'string',
      description: 'Official = JAMB, NUC, exam body or the university itself. Secondary = news, blogs, summaries.',
      options: {list: ['official', 'secondary'], layout: 'radio', direction: 'horizontal'},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published',
      type: 'date',
      description: 'Publication date stated on the source, if any.',
    }),
    defineField({
      name: 'retrievedAt',
      title: 'Retrieved',
      type: 'date',
      description: 'When we downloaded or read it.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'notes',
      title: 'Notes',
      type: 'text',
      rows: 3,
      description: 'Anything a reviewer should know, e.g. "scanned PDF; page numbers are printed ones".',
    }),
  ],
  preview: {
    select: {title: 'title', publisher: 'publisher', authority: 'authority'},
    prepare: ({title, publisher, authority}) => ({
      title,
      subtitle: [publisher, authority].filter(Boolean).join(' · '),
    }),
  },
})
