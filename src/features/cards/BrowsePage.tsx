import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useSearchCards } from '@/hooks/useCards'
import { CardTypeBadge } from './CardTypeBadge'
import { getCardTitle } from './cardTypeMeta'

export function BrowsePage() {
  const { data: cards, isLoading } = useSearchCards({})

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm text-muted">
          {isLoading
            ? 'Loading…'
            : `${cards?.length ?? 0} card${cards?.length === 1 ? '' : 's'}`}
        </p>
        <Link to="/cards/new">
          <Button variant="primary">
            <Plus size={15} /> New card
          </Button>
        </Link>
      </div>

      {!isLoading && cards?.length === 0 && (
        <div className="rounded-card border border-dashed border-border bg-panel p-10 text-center">
          <p className="text-sm text-muted">No cards yet.</p>
          <Link to="/cards/new" className="mt-3 inline-block">
            <Button variant="primary">Create your first card</Button>
          </Link>
        </div>
      )}

      <div className="space-y-2.5">
        {cards?.map((card) => (
          <Link
            key={card.id}
            to={`/cards/${card.id}/edit`}
            className="flex items-center gap-3.5 rounded-[10px] border border-border bg-panel px-4 py-3 hover:border-accent"
          >
            <CardTypeBadge type={card.type} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">
                {getCardTitle(card)}
              </div>
              {card.tags.length > 0 && (
                <div className="mt-0.5 flex gap-2 text-xs text-blue">
                  {card.tags.map((tag) => (
                    <span key={tag} className="font-mono">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
