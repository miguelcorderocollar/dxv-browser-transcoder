'use client'

import { type FFmpegStatus, type TranscodeProgress } from '@/hooks/use-ffmpeg'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  CheckCircle2Icon,
  CircleDotIcon,
  ClipboardIcon,
  LoaderIcon,
  TerminalIcon,
  XCircleIcon,
} from 'lucide-react'
import { useRef, useEffect, useState } from 'react'

interface TranscodePanelProps {
  status: FFmpegStatus
  progress: TranscodeProgress | null
  logs: string[]
  ffmpegCLI?: string
  onLoad: () => void
  onTranscode: () => void
  onCancel: () => void
  outputFormat: 'mp4'
  onFormatChange: (f: 'mp4') => void
  hasFile: boolean
}

const STATUS_CONFIG = {
  idle:       { label: 'Idle',       color: 'border-border text-muted-foreground' },
  loading:    { label: 'Loading…',   color: 'border-cyan/40 text-cyan' },
  ready:      { label: 'Ready',      color: 'border-emerald-400/40 text-emerald-400' },
  processing: { label: 'Processing', color: 'border-warn/40 text-warn' },
  error:      { label: 'Error',      color: 'border-destructive/40 text-destructive' },
}

export function TranscodePanel({
  status,
  progress,
  logs,
  ffmpegCLI,
  onLoad,
  onTranscode,
  onCancel,
  outputFormat,
  onFormatChange,
  hasFile,
}: TranscodePanelProps) {
  const logRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [logs])

  const handleCopy = async () => {
    if (!ffmpegCLI) return
    await navigator.clipboard.writeText(ffmpegCLI)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const cfg = STATUS_CONFIG[status]
  const isProcessing = status === 'processing'
  const isLoading = status === 'loading'
  const isReady = status === 'ready'
  const isError = status === 'error'
  const isIdle = status === 'idle'

  const percentStr = progress ? `${Math.round(progress.ratio * 100)}%` : '0%'
  const progressVal = progress ? Math.round(progress.ratio * 100) : 0

  return (
    <div className="flex flex-col gap-3">
      {/* Status bar */}
      <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <Badge variant="outline" className={cn('text-[10px] px-2 h-5 font-mono', cfg.color)}>
            {isLoading || isProcessing ? (
              <LoaderIcon className="size-3 mr-1.5 animate-spin" />
            ) : isReady ? (
              <CheckCircle2Icon className="size-3 mr-1.5" />
            ) : isError ? (
              <XCircleIcon className="size-3 mr-1.5" />
            ) : (
              <CircleDotIcon className="size-3 mr-1.5" />
            )}
            FFmpeg WASM — {cfg.label}
          </Badge>

          {isProcessing && progress && (
            <span className="text-xs font-mono text-warn tabular-nums">
              {percentStr}
              {progress.fps > 0 && ` · ${progress.fps.toFixed(0)} fps`}
              {progress.speed > 0 && ` · ${progress.speed.toFixed(1)}x`}
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {(isIdle || isError) && (
            <button
              type="button"
              onClick={onLoad}
              className="text-xs text-cyan hover:text-cyan/80 font-mono underline underline-offset-2 transition-colors"
            >
              Load FFmpeg
            </button>
          )}

          {isReady && hasFile && (
            <>
              <div className="rounded border border-cyan/30 bg-surface-raised px-2 py-1 text-[10px] font-mono text-cyan">
                .{outputFormat}
              </div>
              <button
                type="button"
                onClick={onTranscode}
                className={cn(
                  'rounded border border-cyan/40 bg-cyan/10 px-3 py-1',
                  'text-xs font-mono text-cyan hover:bg-cyan/20 transition-colors',
                )}
              >
                Transcode →
              </button>
            </>
          )}

          {isProcessing && (
            <button
              type="button"
              onClick={onCancel}
              className="text-xs text-destructive hover:text-destructive/80 font-mono underline underline-offset-2 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {isProcessing && (
        <div className="flex flex-col gap-1">
          <Progress
            value={progressVal}
            className="h-1.5 bg-surface [&>div]:bg-cyan [&>div]:transition-all [&>div]:duration-300"
          />
          {progress && progress.time > 0 && (
            <p className="text-[10px] font-mono text-muted-foreground">
              {progress.time.toFixed(1)}s processed · frame {progress.frame}
            </p>
          )}
        </div>
      )}

      {/* FFmpeg CLI reference */}
      {ffmpegCLI && (
        <div className="rounded-lg border border-border bg-surface overflow-hidden">
          <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border bg-surface-raised">
            <div className="flex items-center gap-2">
              <TerminalIcon className="size-3 text-muted-foreground" />
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">CLI equivalent</span>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors"
            >
              <ClipboardIcon className="size-3" />
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <pre className="px-3 py-2.5 text-[11px] font-mono text-cyan/80 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
            {ffmpegCLI}
          </pre>
        </div>
      )}

      {/* Log output */}
      {logs.length > 0 && (
        <div className="rounded-lg border border-border bg-[oklch(0.07_0_0)] overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-surface">
            <TerminalIcon className="size-3 text-muted-foreground" />
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">FFmpeg log</span>
            <span className="ml-auto text-[10px] font-mono text-muted-foreground">{logs.length} lines</span>
          </div>
          <div
            ref={logRef}
            className="h-36 overflow-y-auto px-3 py-2"
            role="log"
            aria-live="polite"
            aria-label="FFmpeg output log"
          >
            {logs.map((line, i) => (
              <p
                key={i}
                className={cn(
                  'text-[10px] font-mono leading-5 whitespace-pre-wrap break-all',
                  line.includes('error') || line.includes('Error')
                    ? 'text-destructive'
                    : line.includes('[dxv-player]')
                    ? 'text-cyan/70'
                    : 'text-muted-foreground',
                )}
              >
                {line}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
