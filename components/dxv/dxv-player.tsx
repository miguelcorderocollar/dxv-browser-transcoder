'use client'

import { useFFmpeg } from '@/hooks/use-ffmpeg'
import { analyzeDXVFile, buildFFmpegCLI, type DXVMetadata } from '@/lib/dxv'
import { DropZone } from './drop-zone'
import { MetadataPanel } from './metadata-panel'
import { TranscodePanel } from './transcode-panel'
import { VideoPreview } from './video-preview'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useCallback, useState } from 'react'

type OutputFormat = 'mp4'

interface PlayerState {
  file: File | null
  metadata: DXVMetadata | null
  outputBlob: Blob | null
  outputURL: string | null
  outputFormat: OutputFormat
}

export function DXVPlayer() {
  const ff = useFFmpeg()

  const [state, setState] = useState<PlayerState>({
    file: null,
    metadata: null,
    outputBlob: null,
    outputURL: null,
    outputFormat: 'mp4',
  })

  // -------------------------------------------------------------------------
  // File selection
  // -------------------------------------------------------------------------
  const handleFile = useCallback(async (file: File) => {
    // Revoke previous output URL
    if (state.outputURL) URL.revokeObjectURL(state.outputURL)

    // Start probing immediately — load ffmpeg in background
    let probeOutput: string | undefined

    // Optimistically parse the binary header (no ffmpeg needed)
    const metadata = await analyzeDXVFile(file, probeOutput)

    setState({
      file,
      metadata,
      outputBlob: null,
      outputURL: null,
      outputFormat: state.outputFormat,
    })

    // If ffmpeg is ready, do a proper probe and update metadata
    if (ff.status === 'ready') {
      try {
        probeOutput = await ff.probe(file)
        const richMetadata = await analyzeDXVFile(file, probeOutput)
        setState(prev => ({ ...prev, metadata: richMetadata }))
      } catch (_) {
        // Probe failed — keep the header-only metadata
      }
    }
  }, [state.outputURL, state.outputFormat, ff])

  // -------------------------------------------------------------------------
  // Load FFmpeg WASM
  // -------------------------------------------------------------------------
  const handleLoad = useCallback(async () => {
    await ff.load()

    // If a file is already loaded, re-probe it now that ffmpeg is available
    if (state.file && ff.status !== 'processing') {
      try {
        const probeOutput = await ff.probe(state.file)
        const richMetadata = await analyzeDXVFile(state.file, probeOutput)
        setState(prev => ({ ...prev, metadata: richMetadata }))
      } catch (_) {}
    }
  }, [ff, state.file])

  // -------------------------------------------------------------------------
  // Transcode
  // -------------------------------------------------------------------------
  const handleTranscode = useCallback(async () => {
    if (!state.file) return
    if (state.outputURL) URL.revokeObjectURL(state.outputURL)

    const blob = await ff.transcode(state.file, state.outputFormat)
    if (!blob) return

    const url = URL.createObjectURL(blob)
    setState(prev => ({ ...prev, outputBlob: blob, outputURL: url }))
  }, [ff, state.file, state.outputFormat, state.outputURL])

  // -------------------------------------------------------------------------
  // Download
  // -------------------------------------------------------------------------
  const handleDownload = useCallback(() => {
    if (!state.outputBlob || !state.file) return
    const a = document.createElement('a')
    const baseName = state.file.name.replace(/\.[^.]+$/, '')
    a.href = state.outputURL!
    a.download = `${baseName}_transcoded.${state.outputFormat}`
    a.click()
  }, [state.outputBlob, state.outputURL, state.file, state.outputFormat])

  const handleFormatChange = useCallback((fmt: OutputFormat) => {
    setState(prev => ({ ...prev, outputFormat: fmt }))
  }, [])

  const ffmpegCLI = state.file
    ? buildFFmpegCLI(state.file.name, state.outputFormat)
    : undefined

  return (
    <TooltipProvider delay={300}>
      <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto">
        {/* Top: upload + metadata side by side once file loaded */}
        {!state.file ? (
          <div className="w-full max-w-xl mx-auto">
            <DropZone onFile={handleFile} disabled={ff.status === 'processing'} />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
            {/* Left column — video & transcode */}
            <div className="flex flex-col gap-4">
              {/* Replace / change file */}
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-medium text-foreground truncate max-w-xs">
                    {state.file.name}
                  </h2>
                  <p className="text-xs text-muted-foreground font-mono">
                    {(state.file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (state.outputURL) URL.revokeObjectURL(state.outputURL)
                    setState({ file: null, metadata: null, outputBlob: null, outputURL: null, outputFormat: state.outputFormat })
                  }}
                  className="text-xs font-mono text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors shrink-0"
                >
                  Load different file
                </button>
              </div>

              {/* Video preview (shown after transcode) */}
              {state.outputURL ? (
                <VideoPreview
                  src={state.outputURL}
                  mimeType="video/mp4"
                  onDownload={handleDownload}
                  canDownload={!!state.outputBlob}
                />
              ) : (
                /* Pre-transcode: show drop zone as swap target with overlay message */
                <div className="rounded-lg border border-border bg-surface flex items-center justify-center min-h-48">
                  <div className="text-center flex flex-col items-center gap-3 p-8">
                    <div className="text-xs font-mono text-muted-foreground leading-relaxed max-w-xs text-center">
                      DXV files require transcoding before browser playback.
                      <br />
                      Load FFmpeg WASM below and click <span className="text-cyan">Transcode →</span> to preview.
                    </div>
                  </div>
                </div>
              )}

              {/* Transcode panel */}
              <TranscodePanel
                status={ff.status}
                progress={ff.progress}
                logs={ff.logs}
                ffmpegCLI={ffmpegCLI}
                onLoad={handleLoad}
                onTranscode={handleTranscode}
                onCancel={ff.cancel}
                outputFormat={state.outputFormat}
                onFormatChange={handleFormatChange}
                hasFile={!!state.file}
              />
            </div>

            {/* Right column — metadata */}
            {state.metadata && (
              <div className="flex flex-col">
                <MetadataPanel metadata={state.metadata} filename={state.file.name} />
              </div>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}
