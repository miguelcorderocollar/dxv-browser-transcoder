'use client'

import {
  type DXVMetadata,
  formatBitrate,
  formatDuration,
  formatFileSize,
  formatResolution,
  getVariantDescription,
} from '@/lib/dxv'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { AlertTriangleIcon, CheckCircle2Icon, ShieldAlertIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MetadataPanelProps {
  metadata: DXVMetadata
  filename: string
}

interface MetaRowProps {
  label: string
  value: React.ReactNode
  mono?: boolean
  className?: string
}

function MetaRow({ label, value, mono = true, className }: MetaRowProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4 py-1.5', className)}>
      <span className="text-xs text-muted-foreground shrink-0 w-36">{label}</span>
      <span className={cn(
        'text-xs text-right text-foreground break-all',
        mono && 'font-mono',
      )}>
        {value}
      </span>
    </div>
  )
}

const VARIANT_BADGE_CLASS: Record<string, string> = {
  DXV1: 'border-cyan/40 text-cyan bg-cyan/10',
  DXV2: 'border-emerald-400/40 text-emerald-400 bg-emerald-400/10',
  DXV3: 'border-violet-400/40 text-violet-400 bg-violet-400/10',
  unknown: 'border-border text-muted-foreground',
}

const QUALITY_COLORS: Record<string, string> = {
  low: 'text-destructive',
  medium: 'text-warn',
  high: 'text-cyan',
  ultra: 'text-emerald-400',
}

export function MetadataPanel({ metadata, filename }: MetadataPanelProps) {
  const variantClass = VARIANT_BADGE_CLASS[metadata.variant] ?? VARIANT_BADGE_CLASS.unknown
  const qualityColor = metadata.qualityEstimate ? QUALITY_COLORS[metadata.qualityEstimate] : ''

  return (
    <div className="flex flex-col gap-0 rounded-lg border border-border bg-surface overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-surface-raised border-b border-border">
        <p className="text-xs font-mono text-muted-foreground truncate max-w-[200px]" title={filename}>
          {filename}
        </p>
        <div className="flex items-center gap-2 shrink-0">
          {metadata.hasAlpha && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-cyan/30 text-cyan bg-cyan/5">
              ALPHA
            </Badge>
          )}
          <Badge
            variant="outline"
            className={cn('text-[10px] px-1.5 py-0 h-5', variantClass)}
          >
            {metadata.variant === 'unknown' ? 'DXV?' : metadata.variant}
          </Badge>
        </div>
      </div>

      {/* Codec description */}
      <div className="px-4 py-2.5 bg-surface border-b border-border">
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          {getVariantDescription(metadata.variant)}
        </p>
      </div>

      {/* Video section */}
      <div className="px-4 pt-3 pb-1">
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">Video</p>
        <MetaRow label="Resolution" value={formatResolution(metadata.width, metadata.height)} />
        <MetaRow label="Frame rate" value={metadata.fps !== null ? `${metadata.fps} fps` : '—'} />
        <MetaRow label="Duration" value={formatDuration(metadata.duration)} />
        <MetaRow label="Bitrate" value={
          <span className={qualityColor}>{formatBitrate(metadata.bitrate)}</span>
        } />
        <MetaRow label="Compression" value={metadata.compressionType} />
        <MetaRow label="Bits per pixel" value={metadata.bitsPerPixel > 0 ? `${metadata.bitsPerPixel} bpp` : '—'} />
        <MetaRow label="FourCC" value={
          <span className="text-cyan">{metadata.fourCC === 'DXV ' ? 'DXV\\x20' : metadata.fourCC}</span>
        } />
        <MetaRow
          label="Block aligned"
          value={
            metadata.blockAligned === null ? '—' : metadata.blockAligned ? (
              <span className="flex items-center gap-1 justify-end text-emerald-400">
                <CheckCircle2Icon className="size-3" />
                Yes (÷4)
              </span>
            ) : (
              <span className="flex items-center gap-1 justify-end text-warn">
                <AlertTriangleIcon className="size-3" />
                No — may corrupt
              </span>
            )
          }
        />
      </div>

      <Separator className="mx-4 my-1" />

      {/* Audio section */}
      <div className="px-4 pt-1 pb-1">
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">Audio</p>
        {metadata.audioCodec ? (
          <>
            <MetaRow label="Codec" value={metadata.audioCodec.toUpperCase()} />
            <MetaRow label="Sample rate" value={metadata.audioSampleRate !== null ? `${metadata.audioSampleRate} Hz` : '—'} />
            <MetaRow label="Channels" value={
              metadata.audioChannels === 2 ? 'Stereo' :
              metadata.audioChannels === 1 ? 'Mono' :
              metadata.audioChannels !== null ? `${metadata.audioChannels} ch` : '—'
            } />
          </>
        ) : (
          <p className="text-xs text-muted-foreground py-1.5">No audio track detected</p>
        )}
      </div>

      <Separator className="mx-4 my-1" />

      {/* File section */}
      <div className="px-4 pt-1 pb-3">
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">File</p>
        <MetaRow label="File size" value={formatFileSize(metadata.fileSize)} />
        {metadata.qualityEstimate && (
          <MetaRow
            label="Quality estimate"
            value={
              <span className={cn('capitalize', qualityColor)}>
                {metadata.qualityEstimate}
              </span>
            }
          />
        )}
      </div>

      {/* Warnings */}
      {metadata.blockAligned === false && (
        <div className="mx-4 mb-3 flex gap-2 items-start rounded border border-warn/30 bg-warn/5 px-3 py-2">
          <ShieldAlertIcon className="size-3 text-warn mt-0.5 shrink-0" />
          <p className="text-[11px] text-warn leading-relaxed">
            Dimensions not 4-pixel aligned. DXT/BCn block compression requires width and height divisible by 4. Some decoders may reject or corrupt this file.
          </p>
        </div>
      )}
    </div>
  )
}
