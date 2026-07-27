import { useState, type ReactNode } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { useIsWideEditor } from './useIsWideEditor'

// Shared Create/Edit shell for every CardV2 interaction type (spec §22.3):
// header (Cancel / title / Preview toggle / Save) plus the editor-vs-preview
// layout. D71/D74/D75/D76/D78 deliberately deferred extracting this out of
// each *EditorShell.tsx until a change actually needed identical treatment
// across all six — the preview-drawer behavior here is that change (see
// docs/itera-decisions.md). The live preview is now opt-in: hidden by
// default so the editor gets full width to breathe, revealed via "Preview
// card" as a slide-in panel rather than a permanent half-width column.
export function CardEditorShell({
  mode,
  onCancel,
  onSave,
  canSave,
  isSaving,
  editorPane,
  previewPane,
}: {
  mode: 'create' | 'edit'
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

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-itera-muted hover:text-itera-ink"
        >
          ← Cancel
        </button>
        <h1 className="text-lg font-semibold tracking-tight text-itera-ink-brand">
          {mode === 'edit' ? 'Edit card' : 'New card'}
        </h1>
        <div className="flex items-center gap-2">
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
          <Button variant="primary" onClick={onSave} disabled={!canSave || isSaving}>
            {isSaving ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Save card'}
          </Button>
        </div>
      </div>

      {isWide ? (
        <div className={cn('preview-shell-row flex items-start', previewOpen ? 'gap-6' : 'gap-0')}>
          <div className="min-w-0 flex-1">
            <div className="mx-auto w-full max-w-2xl">{editorPane}</div>
          </div>
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
