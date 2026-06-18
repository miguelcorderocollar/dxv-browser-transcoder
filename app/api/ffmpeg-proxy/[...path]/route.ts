'use server'

import { NextRequest, NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// /api/ffmpeg-proxy/[...path]
//
// Proxies @ffmpeg/* files from unpkg so the browser fetches them from our
// own origin. This is the only reliable fix for:
//   "Failed to construct 'Worker': Script at 'https://unpkg.com/…' cannot be
//    accessed from origin 'https://…vercel.app'"
//
// Browsers block cross-origin Worker construction unconditionally.
// Serving the files from our own origin makes every URL same-origin so
// Worker construction, dynamic import(), and fetch() all work without
// needing any regex rewriting of the source files.
//
// URL mapping:
//   /api/ffmpeg-proxy/ffmpeg@0.12.15/dist/esm/index.js
//     → https://unpkg.com/@ffmpeg/ffmpeg@0.12.15/dist/esm/index.js
//
//   /api/ffmpeg-proxy/core-mt@0.12.9/dist/esm/ffmpeg-core.wasm
//     → https://unpkg.com/@ffmpeg/core-mt@0.12.9/dist/esm/ffmpeg-core.wasm
// ---------------------------------------------------------------------------

// Allowlist of @ffmpeg sub-packages we are willing to proxy.
const ALLOWED_PACKAGES = new Set([
  'ffmpeg',
  'util',
  'core',
  'core-mt',
])

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params
  if (!path?.length) {
    return NextResponse.json({ error: 'No path provided' }, { status: 400 })
  }

  // The first segment is the package name (without the @ffmpeg/ scope).
  // e.g. path = ['ffmpeg@0.12.15', 'dist', 'esm', 'index.js']
  const [packageSegment, ...rest] = path
  const packageName = packageSegment.split('@')[0] // strip version

  if (!ALLOWED_PACKAGES.has(packageName)) {
    return NextResponse.json({ error: 'Package not allowed' }, { status: 403 })
  }

  const upstreamUrl = `https://unpkg.com/@ffmpeg/${path.join('/')}`

  let upstream: Response
  try {
    upstream = await fetch(upstreamUrl, {
      headers: { 'User-Agent': 'dxv-web-player-proxy/1.0' },
    })
  } catch (err) {
    return NextResponse.json(
      { error: `Upstream fetch failed: ${String(err)}` },
      { status: 502 },
    )
  }

  if (!upstream.ok) {
    return new NextResponse(null, { status: upstream.status })
  }

  const contentType = upstream.headers.get('content-type') ?? 'application/octet-stream'
  const body = await upstream.arrayBuffer()

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      // Cache aggressively — these files are version-pinned and never change.
      'Cache-Control': 'public, max-age=31536000, immutable',
      // Allow the WASM file to be used cross-origin by ffmpeg's internal fetch.
      'Cross-Origin-Resource-Policy': 'cross-origin',
    },
  })
}
