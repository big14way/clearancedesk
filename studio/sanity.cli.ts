import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: 'cynv9mfk',
    dataset: 'production'
  },
  deployment: {
    // Hosted Studio at https://clearance-desk.sanity.studio (Sanity Context's GROQ mode needs a deployed Studio)
    appId: 'ecar3ha40jcscoghbbu7w23f',
    /**
     * Enable auto-updates for studios.
     * Learn more at https://www.sanity.io/docs/studio/latest-version-of-sanity#k47faf43faf56
     */
    autoUpdates: true,
  },
})
