import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'
import {structure} from './structure'

export default defineConfig({
  name: 'default',
  title: 'Clearance Desk',

  projectId: 'cynv9mfk',
  dataset: 'production',

  plugins: [structureTool({structure}), visionTool({defaultApiVersion: '2026-09-01'})],

  schema: {
    types: schemaTypes,
  },
})
