import { cp, mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const publicDir = path.join(rootDir, 'public', 'ffmpeg')

const copies = [
  {
    from: path.join(rootDir, 'node_modules', '@ffmpeg', 'ffmpeg', 'dist', 'esm'),
    to: path.join(publicDir, 'ffmpeg'),
  },
  {
    from: path.join(rootDir, 'node_modules', '@ffmpeg', 'util', 'dist', 'esm'),
    to: path.join(publicDir, 'util'),
  },
  {
    from: path.join(rootDir, 'node_modules', '@ffmpeg', 'core', 'dist', 'esm'),
    to: path.join(publicDir, 'core'),
  },
]

await rm(publicDir, { recursive: true, force: true })
await mkdir(publicDir, { recursive: true })

for (const { from, to } of copies) {
  await cp(from, to, { recursive: true })
}

console.log('Vendored FFmpeg browser assets into public/ffmpeg')