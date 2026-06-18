'use client'

import { cn } from '@/lib/utils'
import { Slider } from '@/components/ui/slider'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  DownloadIcon,
  Maximize2Icon,
  PauseIcon,
  PlayIcon,
  RepeatIcon,
  SquareIcon,
  Volume2Icon,
  VolumeXIcon,
} from 'lucide-react'
import { useCallback } from 'react'

interface PlaybackControlsProps {
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  muted: boolean
  loop: boolean
  onPlayPause: () => void
  onStop: () => void
  onSeek: (seconds: number) => void
  onVolumeChange: (vol: number) => void
  onToggleMute: () => void
  onToggleLoop: () => void
  onFullscreen: () => void
  onDownload?: () => void
  canDownload?: boolean
}

function formatTime(s: number): string {
  if (!isFinite(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}

function ControlButton({
  onClick,
  label,
  active,
  disabled,
  children,
}: {
  onClick: () => void
  label: string
  active?: boolean
  disabled?: boolean
  children: React.ReactNode
}) {
  // base-ui TooltipTrigger uses render prop, not asChild
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            aria-pressed={active}
            className={cn(
              'flex size-8 items-center justify-center rounded transition-colors duration-150',
              'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
              active
                ? 'text-cyan bg-cyan/15 border border-cyan/30'
                : 'text-muted-foreground hover:text-foreground hover:bg-surface-raised border border-transparent',
              disabled && 'opacity-30 cursor-not-allowed',
            )}
          >
            {children}
          </button>
        }
      />
      <TooltipContent side="top" className="text-xs">{label}</TooltipContent>
    </Tooltip>
  )
}

export function PlaybackControls({
  isPlaying,
  currentTime,
  duration,
  volume,
  muted,
  loop,
  onPlayPause,
  onStop,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onToggleLoop,
  onFullscreen,
  onDownload,
  canDownload,
}: PlaybackControlsProps) {
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  // base-ui Slider onValueChange receives number | readonly number[]
  const handleSeek = useCallback((val: number | readonly number[]) => {
    const v = Array.isArray(val) ? (val as number[])[0] : (val as number)
    const t = (v / 100) * duration
    onSeek(t)
  }, [duration, onSeek])

  const handleVolume = useCallback((val: number | readonly number[]) => {
    const v = Array.isArray(val) ? (val as number[])[0] : (val as number)
    onVolumeChange(v / 100)
  }, [onVolumeChange])

  return (
    <div className="flex flex-col gap-2 rounded-b-lg border-x border-b border-border bg-surface px-4 py-3">
      {/* Seek bar */}
      <div className="flex items-center gap-2">
        <span className="w-10 text-right text-[11px] font-mono text-muted-foreground tabular-nums">
          {formatTime(currentTime)}
        </span>
        <div className="relative flex-1">
          <Slider
            value={[progress]}
            min={0}
            max={100}
            step={0.01}
            onValueChange={handleSeek}
            aria-label="Seek"
          />
        </div>
        <span className="w-10 text-[11px] font-mono text-muted-foreground tabular-nums">
          {formatTime(duration)}
        </span>
      </div>

      {/* Controls row */}
      <div className="flex items-center justify-between gap-2">
        {/* Playback buttons */}
        <div className="flex items-center gap-1">
          <ControlButton onClick={onPlayPause} label={isPlaying ? 'Pause' : 'Play'}>
            {isPlaying
              ? <PauseIcon className="size-4" />
              : <PlayIcon className="size-4" />
            }
          </ControlButton>
          <ControlButton onClick={onStop} label="Stop">
            <SquareIcon className="size-3.5" />
          </ControlButton>
          <ControlButton onClick={onToggleLoop} label={loop ? 'Loop on' : 'Loop off'} active={loop}>
            <RepeatIcon className="size-3.5" />
          </ControlButton>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-2">
          <ControlButton onClick={onToggleMute} label={muted ? 'Unmute' : 'Mute'}>
            {muted || volume === 0
              ? <VolumeXIcon className="size-4" />
              : <Volume2Icon className="size-4" />
            }
          </ControlButton>
          <div className="w-20">
            <Slider
              value={[muted ? 0 : Math.round(volume * 100)]}
              min={0}
              max={100}
              step={1}
              onValueChange={handleVolume}
              aria-label="Volume"
            />
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1">
          {canDownload && onDownload && (
            <ControlButton onClick={onDownload} label="Download transcoded file">
              <DownloadIcon className="size-3.5" />
            </ControlButton>
          )}
          <ControlButton onClick={onFullscreen} label="Fullscreen">
            <Maximize2Icon className="size-3.5" />
          </ControlButton>
        </div>
      </div>
    </div>
  )
}
