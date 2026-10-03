import {defineField, defineType} from 'sanity'

export const citation = defineType({
  name: 'citation',
  title: 'Citation',
  type: 'object',
  description: 'Points to the exact place in a source that states this rule.',
  fields: [
    defineField({
      name: 'source',
      title: 'Source',
      type: 'reference',
      to: [{type: 'source'}],
      description: 'The document, page or bulletin this rule was taken from.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'locator',
      title: 'Locator',
      type: 'string',
      description: 'Where in the source, e.g. "p. 22, Faculty of Physical Sciences table".',
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: {title: 'source.title', subtitle: 'locator'},
  },
})
