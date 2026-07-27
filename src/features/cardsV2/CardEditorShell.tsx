import { useState, type ReactNode } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { useIsWideEditor } from './useIsWideEditor'

// Editor column width when the preview is closed (also the shell's own
// max-width then); the preview drawer adds PREVIEW_COL + GAP on top of it
// when open. Kept as named constants since both the shell wrapper and the
// drawer/gap need the exact same numbers to stay visually in sync.
const EDITOR_COL = '42rem'
const PREVIEW_COL = '420px'
const GAP = '1.5rem'

// Shared Create/Edit shell for every CardV2 interaction type (spec §22.3).
// Redesigned per product feedback: the previous header had three unrelated
// alignment anchors (a left-floating Cancel, a mathematically-centered
// title, a right-floating action cluster) sitting above a body whose width
// changed when the preview opened — no consistent alignment was possible
// that way. Now header and content share one literal outer width (this
// component's own root div, not just each row separately), the title is
// left-aligned with a contextual subtitle, and the action group (Preview /
// Back to deck / Save) lives together on the right — Save is the only solid
// action, matching D71-era spec intent that Save should visually dominate.
// (The old AppShell topbar this used to suppress via useSetPageHeader is
// gone — the shared shell has no per-route title bar to compete with.)
export function CardEditorShell({
  mode,
  subtitle,
  onCancel,
  onSave,
  canSave,
  isSaving,
  editorPane,
  previewPane,
}: {
  mode: 'create' | 'edit'
  subtitle: string
  onCancel: () => void
  onSave: () => void
  canSave: boolean
  isSaving: boolean
  editorPane: ReactNode
  previewPane: ReactNode
}) {
  const isWide = useIsWideEditor()
  const [tab, setTab] = useState<'editor' | 'preview'>('editor')
  const [previewOpen, setPreviewOpen] = useState(false)
  const title = mode === 'edit' ? 'Edit card' : 'Create card'

  return (
    <div
      className="card-editor-shell mx-auto w-full"
      style={{
        maxWidth: !isWide ? 'none' : previewOpen ? `calc(${EDITOR_COL} + ${GAP} + ${PREVIEW_COL})` : EDITOR_COL,
      }}
    >
      <header className="mb-5 grid grid-cols-1 items-start gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold tracking-tight text-itera-ink-brand">
            {title}
          </h1>
          <p className="truncate text-xs text-itera-muted">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {isWide && (
            <button
              type="button"
              onClick={() => setPreviewOpen((open) => !open)}
              aria-pressed={previewOpen}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-itera-control border px-3 py-2 text-xs font-semibold transition-colors',
                previewOpen
                  ? 'border-itera-accent bg-itera-accent-soft text-itera-ink-brand'
                  : 'border-itera-border text-itera-muted hover:text-itera-ink',
              )}
            >
              {previewOpen ? <EyeOff size={14} /> : <Eye size={14} />}
              {previewOpen ? 'Hide preview' : 'Preview card'}
            </button>
          )}
          <button
            type="button"
            onClick={onCancel}
            className="rounded-itera-control px-3 py-2 text-xs font-semibold text-itera-muted hover:text-itera-ink"
          >
            ← Back to deck
          </button>
          <Button variant="primary" onClick={onSave} disabled={!canSave || isSaving}>
            {isSaving ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Save card'}
          </Button>
        </div>
      </header>

      {isWide ? (
        <div className={cn('preview-shell-row flex items-start', previewOpen ? 'gap-6' : 'gap-0')}>
          <div className="min-w-0 flex-1">{editorPane}</div>
          <div
            className={cn(
              'preview-drawer shrink-0 overflow-hidden',
              previewOpen ? 'w-[420px] opacity-100' : 'w-0 opacity-0',
            )}
            aria-hidden={!previewOpen}
          >
            <div className="w-[420px]">{previewPane}</div>
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-4 flex gap-1 rounded-itera-control border border-itera-border p-1">
            {(['editor', 'preview'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  'flex-1 rounded-[7px] py-1.5 text-sm font-semibold capitalize transition-colors',
                  tab === t ? 'bg-itera-accent-soft text-itera-ink-brand' : 'text-itera-muted',
                )}
              >
                {t}
              </button>
            ))}
          </div>
          {tab === 'editor' ? editorPane : previewPane}
        </div>
      )}
    </div>
  )
}
