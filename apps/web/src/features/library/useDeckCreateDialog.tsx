import { useState } from 'react'
import { DeckCreateDialog, type DeckCreateDialogProps } from './DeckCreateDialog'

export function useDeckCreateDialog() {
  const [request, setRequest] = useState<Omit<DeckCreateDialogProps, 'onClose'> | null>(null)
  return {
    openCreateDeck(options: Pick<DeckCreateDialogProps, 'parentId' | 'parentName'> = {}) {
      setRequest({
        ...options,
        returnFocusTo: document.activeElement instanceof HTMLElement ? document.activeElement : null,
      })
    },
    dialog: request && <DeckCreateDialog {...request} onClose={() => setRequest(null)} />,
  }
}
