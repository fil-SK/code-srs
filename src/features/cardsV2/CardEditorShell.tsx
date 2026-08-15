import { useState, type ReactNode } from 'react'
import { AlertTriangle, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { isLongCardPrompt } from '@/features/reviewV2/components/promptLength'
import { useIsWideEditor } from './useIsWideEditor'

// Shared Create/Edit shell for every CardV2 interaction type. The create
// route supplies the numbered interaction section above this component; this
// shell owns the content/preview composition and the reference-aligned footer.
export function CardEditorShell({
  mode,
  subtitle,
  prompt,
  onCancel,
  onSave,
  canSave,
  isSaving,
  editorPane,
  previewPane,
}: {
  mode: 'create' | 'edit'
  subtitle: string
  prompt: string
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
  const promptIsLong = isLongCardPrompt(prompt)

  const formContent = (
    <>
      {promptIsLong && (
        <div
          role="status"
          className="mx-5 mt-5 flex items-start gap-3 rounded-itera-control border border-itera-warning/35 bg-itera-warning-soft px-4 py-3 text-sm text-itera-ink sm:mx-6 sm:mt-6"
        >
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-itera-warning" />
          <div>
            <p className="font-semibold text-itera-ink-brand">This prompt is unusually long.</p>
            <p className="mt-0.5 text-itera-muted">
              Review will use smaller text. Consider shortening it or splitting it into focused cards.
            </p>
          </div>
        </div>
      )}
      {editorPane}
    </>
  )

  return (
    <div
      className={cn(
        'card-editor-shell mx-auto w-full',
        mode === 'edit' && 'max-w-[1120px] overflow-hidden rounded-itera-card border border-itera-border bg-itera-surface',
      )}
    >
      {mode === 'edit' && (
        <header className="border-b border-itera-border px-5 py-4 sm:px-6">
          <h1 className="text-xl font-semibold tracking-tight text-itera-ink-brand">Edit card</h1>
          <p className="truncate text-xs text-itera-muted">{subtitle}</p>
        </header>
      )}

      {isWide ? (
        <div className={cn('preview-shell-row flex items-start', previewOpen ? 'gap-6' : 'gap-0')}>
          <div className="min-w-0 flex-1">{formContent}</div>
          <div
            className={cn(
              'preview-drawer shrink-0 overflow-hidden border-l border-itera-border',
              previewOpen ? 'w-[420px] opacity-100' : 'w-0 opacity-0',
            )}
            aria-hidden={!previewOpen}
          >
            <div className="w-[420px]">{previewPane}</div>
          </div>
        </div>
      ) : (
        <div>
          <div className="mx-5 mt-5 flex gap-1 rounded-itera-control border border-itera-border p-1 sm:mx-6 sm:mt-6">
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
          {tab === 'editor' ? formContent : <div className="p-5 sm:p-6">{previewPane}</div>}
        </div>
      )}

      <footer className="relative flex flex-col-reverse gap-3 px-5 py-4 before:absolute before:left-5 before:right-5 before:top-0 before:h-px before:bg-itera-border sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:before:left-6 sm:before:right-6">
        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            className="min-w-[92px] shadow-none"
            onClick={onSave}
            disabled={!canSave || isSaving}
          >
            {isSaving ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Save card'}
          </Button>
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        </div>
        {isWide && (
          <button
            type="button"
            onClick={() => setPreviewOpen((open) => !open)}
            aria-pressed={previewOpen}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 rounded-itera-control border px-3 py-2 text-sm font-semibold transition-colors',
              previewOpen
                ? 'border-itera-accent bg-itera-accent-soft text-itera-ink-brand'
                : 'border-itera-border bg-itera-surface text-itera-muted hover:border-itera-border-strong hover:text-itera-ink',
            )}
          >
            {previewOpen ? <EyeOff size={15} /> : <Eye size={15} />}
            {previewOpen ? 'Hide preview' : 'Preview card'}
          </button>
        )}
      </footer>
    </div>
  )
}
