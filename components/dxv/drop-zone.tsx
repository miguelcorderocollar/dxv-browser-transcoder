'use client'

import { cn } from '@/lib/utils'
import { UploadIcon } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'

interface DropZoneProps {
  onFile: (file: File) => void
  disabled?: boolean
}

const ACCEPTED_EXTENSIONS = ['.mov', '.dxv']
const ACCEPTED_MIME = ['video/quicktime', 'video/x-dxv', '']

export function DropZone({ onFile, disabled }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const validate = (file: File): string | null => {
    const name = file.name.toLowerCase()
    if (!ACCEPTED_EXTENSIONS.some(ext => name.endsWith(ext))) {
      return `Unsupported file type. Expected .mov or .dxv — got "${file.name}".`
    }
    return null
  }

  const handleFile = useCallback((file: File) => {
    const err = validate(file)
    if (err) { setError(err); return }
    setError(null)
    onFile(file)
  }, [onFile])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (disabled) return
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [disabled, handleFile])

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) setIsDragging(true)
  }, [disabled])

  const onDragLeave = useCallback(() => setIsDragging(false), [])

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={cn(
          'relative flex flex-col items-center justify-center gap-4',
          'w-full min-h-56 rounded-lg border-2 border-dashed',
          'transition-all duration-200 cursor-pointer',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          isDragging
            ? 'border-cyan bg-cyan/5 scale-[1.01]'
            : 'border-border bg-surface hover:border-cyan/50 hover:bg-surface-raised',
          disabled && 'opacity-40 cursor-not-allowed',
        )}
        aria-label="Upload DXV file — click or drag and drop"
      >
        {/* Grid pattern background */}
        <div
          className="absolute inset-0 rounded-lg opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(oklch(0.78 0.14 198) 1px, transparent 1px), linear-gradient(90deg, oklch(0.78 0.14 198) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
          aria-hidden="true"
        />

        <div className={cn(
          'flex size-14 items-center justify-center rounded-full border border-border',
          'bg-surface-raised transition-colors duration-200',
          isDragging && 'border-cyan/40 bg-cyan/10',
        )}>
          <UploadIcon
            className={cn(
              'size-6 transition-colors duration-200',
              isDragging ? 'text-cyan' : 'text-muted-foreground',
            )}
          />
        </div>

        <div className="flex flex-col items-center gap-1 text-center">
          <p className="text-sm font-medium text-foreground">
            {isDragging ? 'Drop to load' : 'Drop a DXV file here'}
          </p>
          <p className="text-xs text-muted-foreground font-mono">
            .mov — Resolume DXV1 / DXV2 / DXV3
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="h-px w-12 bg-border" />
          <span className="text-xs text-muted-foreground">or</span>
          <span className="h-px w-12 bg-border" />
        </div>

        <div className={cn(
          'rounded-md border border-border bg-surface-raised px-4 py-1.5',
          'text-xs font-medium text-foreground transition-colors duration-150',
          'group-hover:border-cyan/50',
        )}>
          Browse file
        </div>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept=".mov,.dxv,video/quicktime,video/x-dxv"
        className="sr-only"
        onChange={onInputChange}
        aria-hidden="true"
        tabIndex={-1}
      />

      {error && (
        <p role="alert" className="text-xs text-destructive font-mono bg-destructive/10 border border-destructive/20 rounded px-3 py-2">
          {error}
        </p>
      )}
    </div>
  )
}
