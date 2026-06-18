import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Prevent Next.js from attempting to bundle ffmpeg packages server-side.
  serverExternalPackages: ['@ffmpeg/ffmpeg', '@ffmpeg/util', '@ffmpeg/core'],

  // Next.js 16 uses Turbopack by default. Turbopack ignores the webpack()
  // function, so we configure it separately. We redirect @ffmpeg/* to an empty
  // stub so Turbopack skips bundling these WASM-heavy packages entirely.
  // The real modules are loaded at runtime via dynamic import() in the hook.
  turbopack: {
    resolveAlias: {
      '@ffmpeg/ffmpeg': path.resolve(__dirname, 'lib/ffmpeg-stub.js'),
      '@ffmpeg/util': path.resolve(__dirname, 'lib/ffmpeg-stub.js'),
      '@ffmpeg/core': path.resolve(__dirname, 'lib/ffmpeg-stub.js'),
    },
  },
}

export default nextConfig
