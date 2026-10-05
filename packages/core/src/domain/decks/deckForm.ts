// The Deck editor's form shape and validation rules.
//
// Follows the `{canSave, errors}` contract the six card validators already
// return, for the same reason they have one: a platform may render the list or
// gate on `canSave` alone, but neither may decide what "valid" means. The rule
// still requires a nonblank name. An optional icon must be a shared catalog id.

import { isDeckIconId, type DeckIconId } from '../../design/deckIcons'

export interface DeckFormState {
  name: string
  description: string
  iconId?: DeckIconId
}

export interface DeckValidation {
  canSave: boolean
  errors: string[]
}

export function emptyDeckForm(): DeckFormState {
  return { name: '', description: '' }
}

export function validateDeckForm(form: DeckFormState): DeckValidation {
  const errors: string[] = []

  if (form.name.trim().length === 0) errors.push('Deck name is required.')
  if (form.iconId !== undefined && !isDeckIconId(form.iconId)) {
    errors.push('Choose a supported deck icon.')
  }

  return { canSave: errors.length === 0, errors }
}
