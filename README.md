# DXV Browser Transcoder

DXV Browser Transcoder is a Next.js app for inspecting Resolume DXV `.mov` files in the browser, extracting useful metadata, and transcoding them to browser-playable MP4 using FFmpeg WASM.

## What It Does

- Loads DXV files directly in the browser
- Parses DXV variant and container metadata
- Uses vendored FFmpeg WASM assets served from the app itself
- Transcodes DXV video to MP4 for in-browser preview and download
- Runs locally or on Vercel without relying on remote FFmpeg worker assets

## Stack

- Next.js 16
- React 19
- TypeScript
- FFmpeg WASM (`@ffmpeg/ffmpeg`, `@ffmpeg/util`, `@ffmpeg/core`)

## Development

Install dependencies:

```bash
pnpm install
```

Start the dev server:

```bash
pnpm dev
```

The app vendors FFmpeg browser assets into `public/ffmpeg` automatically during `postinstall`, `dev`, and `build`.

## Build

```bash
pnpm build
pnpm start
```

## Deployment Notes

This project avoids the common FFmpeg WASM cross-origin worker failure by serving FFmpeg assets from the application itself instead of loading them from a CDN.

## Current Output Format

The transcoder currently targets MP4 output only. That keeps playback and download behavior consistent across browsers and avoids exposing a broken WebM path.