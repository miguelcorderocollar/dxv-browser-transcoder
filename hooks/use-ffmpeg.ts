'use client'

// All @ffmpeg/* imports are intentionally absent at the module level.
// Any static import — even `import type` — can cause webpack to walk the
// module graph into @ffmpeg/ffmpeg, which contains dynamic import() expressions
// with computed paths. That triggers a "WorkerError / Call retries exceeded"
// crash on Vercel. We use a local interface instead and load everything at
// runtime via /* webpackIgnore: true */ dynamic imports below.
import { useCallback, useRef, useState } from 'react'

// Minimal local interface matching the @ffmpeg/ffmpeg FFmpeg class surface we use.
interface IFFmpeg {
  load(opts: { coreURL: string; wasmURL?: string; workerURL?: string }): Promise<void>
  exec(args: string[]): Promise<number>
  ffprobe(args: string[]): Promise<number>
  writeFile(name: string, data: Uint8Array | string): Promise<void>
  readFile(name: string): Promise<Uint8Array>
  deleteFile(name: string): Promise<void>
  terminate(): void
  on(event: 'log', handler: (e: { message: string }) => void): void
  on(event: 'progress', handler: (e: { progress: number; time: number }) => void): void
  off(event: 'log', handler: (e: { message: string }) => void): void
}

export type FFmpegStatus = 'idle' | 'loading' | 'ready' | 'processing' | 'error'

export interface TranscodeProgress {
  ratio: number   // 0–1
  frame: number
  fps: number
  time: number    // seconds processed so far
  speed: number
}

export interface UseFFmpegReturn {
  status: FFmpegStatus
  progress: TranscodeProgress | null
  logs: string[]
  load: () => Promise<void>
  transcode: (inputFile: File, outputExt?: string) => Promise<Blob | null>
  probe: (inputFile: File) => Promise<string>
  cancel: () => void
  ffmpeg: IFFmpeg | null
}

const FFMPEG_BASE = '/ffmpeg/ffmpeg'
const UTIL_BASE = '/ffmpeg/util'
const CORE_BASE = '/ffmpeg/core'

// Lazily resolved references — populated once on first loadModules() call.
let _FFmpegClass: (new () => IFFmpeg) | null = null
let _fetchFile: ((input: File | string | Blob) => Promise<Uint8Array>) | null = null
let _modulesLoading: Promise<void> | null = null

async function loadModulesOnce() {
  const utilMod = await import(/* webpackIgnore: true */ /* @vite-ignore */ `${UTIL_BASE}/index.js`)
  _fetchFile = utilMod.fetchFile

  const ffmpegMod = await import(/* webpackIgnore: true */ /* @vite-ignore */ `${FFMPEG_BASE}/index.js`)
  if (!ffmpegMod.FFmpeg) {
    throw new Error('FFmpeg class not found in vendored browser assets.')
  }
  _FFmpegClass = ffmpegMod.FFmpeg
}

async function loadModules() {
  if (_FFmpegClass) return
  // Deduplicate concurrent calls — only one load in flight at a time.
  if (!_modulesLoading) {
    _modulesLoading = loadModulesOnce().catch(e => {
      _modulesLoading = null // allow retry on next call
      throw e
    })
  }
  return _modulesLoading
}

export function useFFmpeg(): UseFFmpegReturn {
  const ffmpegRef = useRef<IFFmpeg | null>(null)
  const [status, setStatus] = useState<FFmpegStatus>('idle')
  const [progress, setProgress] = useState<TranscodeProgress | null>(null)
  const [logs, setLogs] = useState<string[]>([])

  const appendLog = useCallback((msg: string) => {
    setLogs(prev => {
      const next = [...prev, msg]
      return next.slice(-200) // keep last 200 lines
    })
  }, [])

  const load = useCallback(async () => {
    if (ffmpegRef.current) return
    setStatus('loading')
    setLogs([])

    try {
      await loadModules()
      const ff = new _FFmpegClass!()

      ff.on('log', ({ message }) => {
        appendLog(message)
      })

      ff.on('progress', ({ progress: ratio, time }) => {
        // Parse additional stats from log buffer (fps, speed) via latest log line
        setProgress(prev => ({
          ratio: Math.max(0, Math.min(1, ratio)),
          frame: prev?.frame ?? 0,
          fps: prev?.fps ?? 0,
          time: time / 1_000_000, // microseconds → seconds
          speed: prev?.speed ?? 0,
        }))
      })

      // Parse fps / speed from log messages
      ff.on('log', ({ message }) => {
        const fpsMatch = message.match(/fps=\s*([\d.]+)/)
        const speedMatch = message.match(/speed=\s*([\d.]+)/)
        const frameMatch = message.match(/^frame=\s*(\d+)/)
        if (fpsMatch || speedMatch || frameMatch) {
          setProgress(prev => ({
            ratio: prev?.ratio ?? 0,
            frame: frameMatch ? parseInt(frameMatch[1]) : (prev?.frame ?? 0),
            fps: fpsMatch ? parseFloat(fpsMatch[1]) : (prev?.fps ?? 0),
            time: prev?.time ?? 0,
            speed: speedMatch ? parseFloat(speedMatch[1]) : (prev?.speed ?? 0),
          }))
        }
      })

      await ff.load({
        coreURL: `${CORE_BASE}/ffmpeg-core.js`,
        wasmURL: `${CORE_BASE}/ffmpeg-core.wasm`,
      })

      ffmpegRef.current = ff
      setStatus('ready')
      appendLog('[dxv-player] FFmpeg WASM loaded successfully')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      appendLog(`[dxv-player] Load error: ${msg}`)
      setStatus('error')
    }
  }, [appendLog])

  const probe = useCallback(async (inputFile: File): Promise<string> => {
    const ff = ffmpegRef.current
    if (!ff) throw new Error('FFmpeg not loaded')

    const inputName = `probe_${Date.now()}.mov`
    await ff.writeFile(inputName, await _fetchFile!(inputFile))

    // Capture probe output via log listener
    const probeLines: string[] = []
    const listener = ({ message }: { message: string }) => probeLines.push(message)
    ff.on('log', listener)

    try {
      await ff.ffprobe(['-hide_banner', '-i', inputName]).catch(() => {
        // ffprobe output is emitted through the log callback; non-zero still returns useful metadata.
      })
    } finally {
      ff.off('log', listener)
      await ff.deleteFile(inputName).catch(() => {})
    }

    return probeLines.join('\n')
  }, [])

  const transcode = useCallback(async (
    inputFile: File,
    outputExt = 'mp4',
  ): Promise<Blob | null> => {
    const ff = ffmpegRef.current
    if (!ff) return null

    setStatus('processing')
    setProgress({ ratio: 0, frame: 0, fps: 0, time: 0, speed: 0 })

    const inputName = `input_${Date.now()}.mov`
    const outputName = `output_${Date.now()}.${outputExt}`

    try {
      await ff.writeFile(inputName, await _fetchFile!(inputFile))
      appendLog(`[dxv-player] Transcoding ${inputFile.name} → ${outputExt}…`)

      const args = buildTranscodeArgs(inputName, outputName, outputExt)
      appendLog(`[dxv-player] ffmpeg ${args.join(' ')}`)

      await ff.exec(args)

      const data = await ff.readFile(outputName)
      const mimeType = outputExt === 'webm' ? 'video/webm' : 'video/mp4'
      const blob = new Blob([data], { type: mimeType })

      setProgress(prev => prev ? { ...prev, ratio: 1 } : {
        ratio: 1,
        frame: 0,
        fps: 0,
        time: 0,
        speed: 0,
      })
      appendLog(`[dxv-player] Done — output size: ${formatBytes(blob.size)}`)
      setStatus('ready')
      return blob
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      appendLog(`[dxv-player] Transcode error: ${msg}`)
      setStatus('error')
      return null
    } finally {
      await ff.deleteFile(inputName).catch(() => {})
      await ff.deleteFile(outputName).catch(() => {})
    }
  }, [appendLog])

  const cancel = useCallback(() => {
    ffmpegRef.current?.terminate()
    ffmpegRef.current = null
    setStatus('idle')
    setProgress(null)
    appendLog('[dxv-player] Cancelled')
  }, [appendLog])

  return {
    status,
    progress,
    logs,
    load,
    transcode,
    probe,
    cancel,
    ffmpeg: ffmpegRef.current,
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildTranscodeArgs(input: string, output: string, ext: string): string[] {
  if (ext === 'webm') {
    return [
      '-i', input,
      '-c:v', 'libvpx',       // VP8 — broadly supported, well-decoded in WASM
      '-b:v', '8M',           // target bitrate
      '-crf', '10',
      '-deadline', 'realtime',
      '-cpu-used', '5',
      '-c:a', 'libvorbis',
      '-y', output,
    ]
  }
  // mp4 fallback
  return [
    '-i', input,
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-crf', '18',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    '-c:a', 'aac',
    '-y', output,
  ]
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}
