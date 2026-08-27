// The Deck editor's form shape and its one validation rule.
//
// Follows the `{canSave, errors}` contract the six card validators already
// return, for the same reason they have one: a platform may render the list or
// gate on `canSave` alone, but neither may decide what "valid" means. The rule
// itself is unchanged - web has always refused a deck whose name is blank or
// only whitespace, in three separate places.

export interface DeckFormState {
  name: string
  description: string
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

  return { canSave: errors.length === 0, errors }
}
