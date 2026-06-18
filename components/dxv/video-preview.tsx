'use client'

import { PlaybackControls } from './playback-controls'
import { cn } from '@/lib/utils'
import { useCallback, useEffect, useRef, useState } from 'react'

interface VideoPreviewProps {
  src: string
  mimeType?: string
  onDownload?: () => void
  canDownload?: boolean
  className?: string
}

export function VideoPreview({
  src,
  mimeType = 'video/webm',
  onDownload,
  canDownload,
  className,
}: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [loop, setLoop] = useState(false)

  // Sync state from video element
  useEffect(() => {
    const v = videoRef.current
    if (!v) return

    const onTimeUpdate = () => setCurrentTime(v.currentTime)
    const onDurationChange = () => setDuration(v.duration || 0)
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onEnded = () => setIsPlaying(false)
    const onVolumeChange = () => {
      setVolume(v.volume)
      setMuted(v.muted)
    }

    v.addEventListener('timeupdate', onTimeUpdate)
    v.addEventListener('durationchange', onDurationChange)
    v.addEventListener('loadedmetadata', onDurationChange)
    v.addEventListener('play', onPlay)
    v.addEventListener('pause', onPause)
    v.addEventListener('ended', onEnded)
    v.addEventListener('volumechange', onVolumeChange)

    return () => {
      v.removeEventListener('timeupdate', onTimeUpdate)
      v.removeEventListener('durationchange', onDurationChange)
      v.removeEventListener('loadedmetadata', onDurationChange)
      v.removeEventListener('play', onPlay)
      v.removeEventListener('pause', onPause)
      v.removeEventListener('ended', onEnded)
      v.removeEventListener('volumechange', onVolumeChange)
    }
  }, [src])

  const handlePlayPause = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) v.play().catch(() => {})
    else v.pause()
  }, [])

  const handleStop = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    v.pause()
    v.currentTime = 0
    setIsPlaying(false)
  }, [])

  const handleSeek = useCallback((seconds: number) => {
    const v = videoRef.current
    if (!v) return
    v.currentTime = seconds
  }, [])

  const handleVolumeChange = useCallback((vol: number) => {
    const v = videoRef.current
    if (!v) return
    v.volume = vol
    if (vol > 0) v.muted = false
  }, [])

  const handleToggleMute = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    v.muted = !v.muted
  }, [])

  const handleToggleLoop = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    v.loop = !v.loop
    setLoop(v.loop)
  }, [])

  const handleFullscreen = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    } else {
      el.requestFullscreen().catch(() => {})
    }
  }, [])

  return (
    <div ref={containerRef} className={cn('flex flex-col rounded-t-lg overflow-hidden border-x border-t border-border', className)}>
      {/* Video area */}
      <div className="relative w-full bg-black flex items-center justify-center" style={{ aspectRatio: '16/9' }}>
        {/* Subtle scanline overlay for the VJ aesthetic */}
        <div
          className="pointer-events-none absolute inset-0 z-10 opacity-[0.03]"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, oklch(0 0 0), oklch(0 0 0) 1px, transparent 1px, transparent 2px)',
          }}
          aria-hidden="true"
        />

        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          ref={videoRef}
          src={src}
          className="max-h-full max-w-full object-contain"
          style={{ width: '100%', height: '100%' }}
          playsInline
          preload="metadata"
          aria-label="DXV video preview"
        >
          <source src={src} type={mimeType} />
          Your browser does not support this video format.
        </video>
      </div>

      {/* Playback controls */}
      <PlaybackControls
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        volume={volume}
        muted={muted}
        loop={loop}
        onPlayPause={handlePlayPause}
        onStop={handleStop}
        onSeek={handleSeek}
        onVolumeChange={handleVolumeChange}
        onToggleMute={handleToggleMute}
        onToggleLoop={handleToggleLoop}
        onFullscreen={handleFullscreen}
        onDownload={onDownload}
        canDownload={canDownload}
      />
    </div>
  )
}
