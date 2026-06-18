/**
 * DXV codec metadata utilities
 *
 * DXV is Resolume's proprietary video codec family. It stores video on the GPU
 * as S3TC / DXT compressed textures, enabling zero-copy GPU upload during VJ
 * performance. The container is always QuickTime (.mov).
 *
 * Variants:
 *   DXV1 / DXV  — DXT1 (BC1): no alpha, 4 bpp, ~6:1 compression
 *   DXV2        — DXT5 (BC3): full alpha, 8 bpp
 *   DXV3        — YCG6 / YG10: luma/chroma split, optional alpha, higher quality
 *
 * FourCC codes found in the QuickTime 'stsd' (sample description) box:
 *   'DXV ' (0x44585620) — DXV1/DXT1
 *   'DXV3' (0x44585633) — DXV2/DXT5
 *   'DXVJ' (0x44585644) — DXV3/YCG6 (no alpha)
 *   'DX10' / variant    — DXV3/YG10 (10-bit chroma)
 *
 * Block alignment: DXT/BCn textures must be padded to multiples of 4 pixels.
 */

export type DXVVariant =
  | 'DXV1'   // DXT1, no alpha
  | 'DXV2'   // DXT5, alpha
  | 'DXV3'   // YCG6 / YG10
  | 'unknown'

export interface DXVMetadata {
  /** Detected codec variant */
  variant: DXVVariant
  /** Raw FourCC string from the file */
  fourCC: string
  /** Whether alpha channel is present */
  hasAlpha: boolean
  /** Bits per pixel for the GPU texture */
  bitsPerPixel: number
  /** S3TC compression type */
  compressionType: 'DXT1/BC1' | 'DXT5/BC3' | 'YCG6' | 'YG10' | 'unknown'
  /** Width in pixels (requires probe output) */
  width: number | null
  /** Height in pixels */
  height: number | null
  /** Whether dimensions are 4-pixel block-aligned (required for DXV) */
  blockAligned: boolean | null
  /** Frame rate */
  fps: number | null
  /** Duration in seconds */
  duration: number | null
  /** Total bitrate in kbps */
  bitrate: number | null
  /** File size in bytes */
  fileSize: number
  /** Audio codec if present */
  audioCodec: string | null
  /** Audio sample rate */
  audioSampleRate: number | null
  /** Number of audio channels */
  audioChannels: number | null
  /** Quality estimate based on bitrate vs resolution */
  qualityEstimate: 'low' | 'medium' | 'high' | 'ultra' | null
}

// ---------------------------------------------------------------------------
// Binary header parsing
// ---------------------------------------------------------------------------

/**
 * Read the FourCC from a QuickTime (.mov) file's mdat/stsd atoms.
 * DXV stores its codec identifier in the video sample description box.
 * We do a fast scan of the first 256 KB looking for known DXV FourCC values.
 */
export async function parseDXVHeader(file: File): Promise<Pick<DXVMetadata, 'fourCC' | 'variant' | 'hasAlpha' | 'bitsPerPixel' | 'compressionType'>> {
  // Read first 256 KB — all relevant atoms are near the start of a .mov
  const sliceSize = Math.min(file.size, 256 * 1024)
  const buffer = await file.slice(0, sliceSize).arrayBuffer()
  const bytes = new Uint8Array(buffer)

  // Known DXV FourCC sequences (ASCII)
  const DXV_SIGNATURES: Record<string, { variant: DXVVariant; hasAlpha: boolean; bpp: number; compression: DXVMetadata['compressionType'] }> = {
    'DXV ':  { variant: 'DXV1', hasAlpha: false, bpp: 4,  compression: 'DXT1/BC1' },
    'DXV3':  { variant: 'DXV2', hasAlpha: true,  bpp: 8,  compression: 'DXT5/BC3' },
    'DXVJ':  { variant: 'DXV3', hasAlpha: false, bpp: 8,  compression: 'YCG6' },
    'DXVG':  { variant: 'DXV3', hasAlpha: true,  bpp: 16, compression: 'YCG6' },
    'DX10':  { variant: 'DXV3', hasAlpha: false, bpp: 16, compression: 'YG10' },
    'DXVD':  { variant: 'DXV3', hasAlpha: true,  bpp: 16, compression: 'YG10' },
  }

  for (let i = 0; i < bytes.length - 4; i++) {
    const cc = String.fromCharCode(bytes[i], bytes[i + 1], bytes[i + 2], bytes[i + 3])
    if (cc in DXV_SIGNATURES) {
      const sig = DXV_SIGNATURES[cc]
      return {
        fourCC: cc,
        variant: sig.variant,
        hasAlpha: sig.hasAlpha,
        bitsPerPixel: sig.bpp,
        compressionType: sig.compression,
      }
    }
  }

  // Fallback — still a .mov but unrecognised DXV variant
  return {
    fourCC: 'unknown',
    variant: 'unknown',
    hasAlpha: false,
    bitsPerPixel: 0,
    compressionType: 'unknown',
  }
}

// ---------------------------------------------------------------------------
// FFprobe output parser
// ---------------------------------------------------------------------------

/**
 * Parse the text output of `ffmpeg -i <file>` (which prints stream info to stderr).
 * We extract resolution, fps, duration, bitrate, and audio info.
 */
export function parseProbeOutput(probeText: string): Pick<
  DXVMetadata,
  'width' | 'height' | 'fps' | 'duration' | 'bitrate' | 'audioCodec' | 'audioSampleRate' | 'audioChannels' | 'blockAligned' | 'qualityEstimate'
> {
  let width: number | null = null
  let height: number | null = null
  let fps: number | null = null
  let duration: number | null = null
  let bitrate: number | null = null
  let audioCodec: string | null = null
  let audioSampleRate: number | null = null
  let audioChannels: number | null = null

  // Duration: "Duration: HH:MM:SS.ms"
  const durationMatch = probeText.match(/Duration:\s*(\d+):(\d+):([\d.]+)/)
  if (durationMatch) {
    duration = parseInt(durationMatch[1]) * 3600
      + parseInt(durationMatch[2]) * 60
      + parseFloat(durationMatch[3])
  }

  // Bitrate: "bitrate: XXXX kb/s"
  const bitrateMatch = probeText.match(/bitrate:\s*(\d+)\s*kb\/s/)
  if (bitrateMatch) bitrate = parseInt(bitrateMatch[1])

  // Video stream resolution + fps
  // e.g. "Video: dxv, yuv420p, 1920x1080, 24 fps"
  const videoStreamMatch = probeText.match(/Video:.*?(\d{2,5})x(\d{2,5}).*?(\d+(?:\.\d+)?)\s*(?:fps|tbr)/)
  if (videoStreamMatch) {
    width = parseInt(videoStreamMatch[1])
    height = parseInt(videoStreamMatch[2])
    fps = parseFloat(videoStreamMatch[3])
  }

  // Audio stream
  // e.g. "Audio: aac, 48000 Hz, stereo, fltp, 320 kb/s"
  const audioMatch = probeText.match(/Audio:\s*([\w\d]+),\s*(\d+)\s*Hz,\s*(\w+)/)
  if (audioMatch) {
    audioCodec = audioMatch[1]
    audioSampleRate = parseInt(audioMatch[2])
    audioChannels = audioMatch[3] === 'stereo' ? 2 : audioMatch[3] === 'mono' ? 1 : null
  }

  // Block alignment check (DXT requires 4-pixel multiples)
  const blockAligned = width !== null && height !== null
    ? width % 4 === 0 && height % 4 === 0
    : null

  // Quality estimate based on bitrate / pixel count
  let qualityEstimate: DXVMetadata['qualityEstimate'] = null
  if (bitrate !== null && width !== null && height !== null) {
    const pixels = width * height
    const bitsPerPixelPerSecond = (bitrate * 1000) / pixels
    if (bitsPerPixelPerSecond < 1) qualityEstimate = 'low'
    else if (bitsPerPixelPerSecond < 3) qualityEstimate = 'medium'
    else if (bitsPerPixelPerSecond < 8) qualityEstimate = 'high'
    else qualityEstimate = 'ultra'
  }

  return { width, height, fps, duration, bitrate, audioCodec, audioSampleRate, audioChannels, blockAligned, qualityEstimate }
}

// ---------------------------------------------------------------------------
// Full metadata assembly
// ---------------------------------------------------------------------------

export async function analyzeDXVFile(
  file: File,
  probeOutput?: string,
): Promise<DXVMetadata> {
  const headerInfo = await parseDXVHeader(file)
  const probeInfo = probeOutput
    ? parseProbeOutput(probeOutput)
    : {
        width: null, height: null, fps: null, duration: null,
        bitrate: null, audioCodec: null, audioSampleRate: null,
        audioChannels: null, blockAligned: null, qualityEstimate: null,
      }

  return {
    ...headerInfo,
    ...probeInfo,
    fileSize: file.size,
  }
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

export function formatDuration(seconds: number | null): string {
  if (seconds === null) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = (seconds % 60).toFixed(2).padStart(5, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`
}

export function formatBitrate(kbps: number | null): string {
  if (kbps === null) return '—'
  if (kbps >= 1000) return `${(kbps / 1000).toFixed(1)} Mb/s`
  return `${kbps} kb/s`
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export function formatResolution(w: number | null, h: number | null): string {
  if (w === null || h === null) return '—'
  const common: Record<string, string> = {
    '3840x2160': '4K UHD', '1920x1080': 'FHD 1080p',
    '1280x720': 'HD 720p', '2560x1440': 'QHD 1440p',
  }
  const key = `${w}x${h}`
  return common[key] ? `${w}×${h} (${common[key]})` : `${w}×${h}`
}

export function getVariantColor(variant: DXVVariant): string {
  switch (variant) {
    case 'DXV1': return 'text-cyan-400'
    case 'DXV2': return 'text-emerald-400'
    case 'DXV3': return 'text-violet-400'
    default: return 'text-muted-foreground'
  }
}

export function getVariantDescription(variant: DXVVariant): string {
  switch (variant) {
    case 'DXV1': return 'DXT1/BC1 — no alpha, 4 bpp, maximum GPU throughput'
    case 'DXV2': return 'DXT5/BC3 — full alpha channel, 8 bpp'
    case 'DXV3': return 'YCG6/YG10 — luma+chroma split, highest quality'
    default: return 'Unknown DXV variant'
  }
}

export function buildFFmpegCLI(filename: string, outputExt = 'mp4'): string {
  return `ffmpeg -i "${filename}" -c:v libx264 -preset ultrafast -crf 18 -pix_fmt yuv420p -movflags +faststart -c:a aac output.mp4`
}
