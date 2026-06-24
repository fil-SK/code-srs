import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Trash2 } from 'lucide-react'
import type { CardType } from '@/types'
import { Button } from '@/components/ui/Button'
import { fieldClass, selectClass } from '@/components/ui/Field'
import { cardTypeMeta } from '@/features/cards/cardTypeMeta'
import { CardTypeBadge } from '@/features/cards/CardTypeBadge'
import { useCreateDraft, useDeleteDraft, useDrafts } from '@/hooks/useDrafts'

const ALL_TYPES = Object.keys(cardTypeMeta) as CardType[]

function timeAgo(ms: number): string {
  const s = Math.floor((Date.now() - ms) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function DraftsPage() {
  const navigate = useNavigate()
  const { data: drafts, isLoading } = useDrafts()
  const createDraft = useCreateDraft()
  const deleteDraft = useDeleteDraft()

  const [text, setText] = useState('')
  const [type, setType] = useState<CardType | ''>('')

  function save() {
    const rawText = text.trim()
    if (!rawText) return
    createDraft.mutate(
      { rawText, intendedType: type || undefined },
      {
        onSuccess: () => {
          setText('')
          setType('')
        },
      },
    )
  }

  return (
    <div>
      <div className="rounded-card border border-border bg-panel p-5">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
          Quick capture
        </div>
        <textarea
          className={`${fieldClass} font-mono`}
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') save()
          }}
          placeholder="Dump a question, snippet, or idea — shape it into a card later…"
        />
        <div className="mt-3 flex items-center gap-2.5">
          <Button variant="primary" onClick={save} disabled={!text.trim()}>
            Save to inbox
          </Button>
          <select
            className={`${selectClass} w-auto`}
            value={type}
            onChange={(e) => setType(e.target.value as CardType | '')}
          >
            <option value="">Type: decide later</option>
            {ALL_TYPES.map((t) => (
              <option key={t} value={t}>
                {cardTypeMeta[t].label}
              </option>
            ))}
          </select>
          <span className="text-xs text-faint">⌘/Ctrl + Enter</span>
        </div>
      </div>

      <div className="mb-3 mt-8 text-xs font-semibold uppercase tracking-wide text-faint">
        Inbox{drafts?.length ? ` · ${drafts.length}` : ''}
      </div>

      {!isLoading && drafts?.length === 0 && (
        <p className="rounded-card border border-dashed border-border bg-panel p-8 text-center text-sm text-muted">
          Inbox empty. Captured drafts show up here to be turned into cards.
        </p>
      )}

      <div className="space-y-2.5">
        {drafts?.map((draft) => (
          <div
            key={draft.id}
            className="flex items-start gap-3 rounded-[10px] border border-border bg-panel px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <div className="line-clamp-2 whitespace-pre-wrap text-sm">
                {draft.rawText}
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-faint">
                <span>{timeAgo(draft.createdAt)}</span>
                {draft.intendedType && (
                  <CardTypeBadge type={draft.intendedType} />
                )}
              </div>
            </div>
            <Button
              variant="secondary"
              onClick={() => navigate(`/cards/new?draft=${draft.id}`)}
            >
              Make card <ArrowRight size={14} />
            </Button>
            <button
              type="button"
              onClick={() => deleteDraft.mutate(draft.id)}
              title="Delete draft"
              aria-label="Delete draft"
              className="grid h-9 w-9 flex-none place-items-center rounded-lg text-muted hover:bg-red/10 hover:text-red"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
