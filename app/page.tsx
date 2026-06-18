import { DXVPlayer } from '@/components/dxv/dxv-player'

export default function Page() {
  return (
    <main className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-surface sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-12 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Logo mark */}
            <div className="flex items-center gap-1.5" aria-hidden="true">
              <div className="size-5 rounded-sm border border-cyan/40 bg-cyan/10 flex items-center justify-center">
                <svg viewBox="0 0 16 16" fill="none" className="size-3.5" aria-hidden="true">
                  <rect x="2" y="2" width="5" height="5" fill="currentColor" className="text-cyan" rx="0.5" />
                  <rect x="9" y="2" width="5" height="5" fill="currentColor" className="text-cyan/50" rx="0.5" />
                  <rect x="2" y="9" width="5" height="5" fill="currentColor" className="text-cyan/50" rx="0.5" />
                  <rect x="9" y="9" width="5" height="5" fill="currentColor" className="text-cyan/30" rx="0.5" />
                </svg>
              </div>
              <span className="text-sm font-mono font-medium text-foreground tracking-tight">DXV Player</span>
            </div>
            <span className="hidden sm:block text-[10px] font-mono text-muted-foreground bg-surface-raised border border-border rounded px-1.5 py-0.5">
              WASM
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden md:block text-xs text-muted-foreground font-mono">
              Resolume DXV1 · DXV2 · DXV3
            </span>
            <a
              href="https://resolume.com/support/dxv"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors font-mono underline underline-offset-2"
            >
              DXV spec
            </a>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 px-4 sm:px-6 py-8">
        <div className="max-w-6xl mx-auto flex flex-col gap-6">
          {/* Subtitle */}
          <div className="flex flex-col gap-1">
            <h1 className="text-lg font-semibold text-foreground text-balance">
              DXV Web Player
            </h1>
            <p className="text-sm text-muted-foreground max-w-xl text-pretty">
              Upload a Resolume DXV file (.mov) to inspect codec metadata, then transcode
              it in-browser via FFmpeg WASM for native HTML5 playback.
            </p>
          </div>

          {/* Capability chips */}
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'DXT1/BC1', sub: 'DXV1' },
              { label: 'DXT5/BC3', sub: 'DXV2' },
              { label: 'YCG6/YG10', sub: 'DXV3' },
              { label: 'Alpha detection', sub: 'RGBA' },
              { label: 'Block alignment', sub: '÷4 check' },
              { label: 'FFmpeg WASM', sub: 'in-browser' },
            ].map(chip => (
              <div
                key={chip.label}
                className="flex items-center gap-1.5 rounded border border-border bg-surface px-2.5 py-1"
              >
                <span className="text-[11px] text-foreground font-mono">{chip.label}</span>
                <span className="text-[10px] text-muted-foreground font-mono">{chip.sub}</span>
              </div>
            ))}
          </div>

          {/* Player */}
          <DXVPlayer />

          {/* Footer note */}
          <div className="border-t border-border pt-4 mt-2">
            <p className="text-[11px] text-muted-foreground font-mono leading-relaxed max-w-2xl">
              All processing happens client-side — no files are uploaded to a server.
              FFmpeg WASM requires <code className="text-cyan/70">SharedArrayBuffer</code> support (COOP/COEP headers enabled).
              DXV is a Resolume proprietary codec; DXV3/YCG6 decode requires the full FFmpeg WASM build.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
