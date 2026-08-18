import type { Card } from '@/types'

// Flatten a card's content into one lowercased string for substring search.
// Tags and the shared prompt/tip/explanation are always included; the
// exhaustive switch means a new interaction fails to compile here until its
// searchable fields are declared.
//
// This is the single implementation, used by both backends. The two private
// copies that previously lived in DexieRepository/SupabaseRepository indexed
// only recall answers, multiple-choice options and write-code answers, so text
// inside ordering, matching and walkthrough cards was silently unfindable.
export function searchableText(card: Card): string {
  const parts: string[] = [
    ...card.tags,
    card.prompt.value,
    card.tip?.value ?? '',
    card.explanation?.value ?? '',
  ]

  const interaction = card.interaction
  switch (interaction.type) {
    case 'recall':
      parts.push(interaction.answer.value)
      break
    case 'multiple_choice':
      parts.push(...interaction.options.map((o) => o.content.value))
      break
    case 'write_code':
      parts.push(interaction.starterCode, ...interaction.acceptedAnswers)
      break
    case 'ordering':
      parts.push(...interaction.items.map((i) => i.content.value))
      break
    case 'matching':
      for (const column of interaction.columns) {
        if (column.label) parts.push(column.label)
        parts.push(...column.items.map((i) => i.content.value))
      }
      break
    case 'walkthrough':
      parts.push(interaction.scenario.value, interaction.code?.value ?? '')
      for (const step of interaction.steps) {
        parts.push(step.prompt.value, step.tip?.value ?? '', step.explanation?.value ?? '')
        if (step.response.type === 'recall') parts.push(step.response.answer.value)
        if (step.response.type === 'multiple_choice') {
          parts.push(...step.response.options.map((o) => o.content.value))
        }
        if (step.response.type === 'exact_input') parts.push(...step.response.acceptedAnswers)
      }
      break
    default: {
      const _exhaustive: never = interaction
      return _exhaustive
    }
  }

  return parts.filter(Boolean).join(' \n ').toLowerCase()
}
