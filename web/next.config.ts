import path from 'node:path'
import type {NextConfig} from 'next'

// The repo root has its own package-lock.json (for scripts/), so Next would guess the repo root as the
// workspace root. The app imports nothing outside web/, so pin both roots here.
const root = path.resolve(__dirname)

const nextConfig: NextConfig = {
  turbopack: {root},
  outputFileTracingRoot: root,
}

export default nextConfig
