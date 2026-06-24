import type { CardType } from '@/types'
import type { CardTypeDefinition } from './types'
import { basicDefinition } from '../renderers/basic'
import { codeReadingDefinition } from '../renderers/codeReading'
import { bugFindingDefinition } from '../renderers/bugFinding'
import { mcqDefinition } from '../renderers/mcq'
import { orderingDefinition } from '../renderers/ordering'
import { matchingDefinition } from '../renderers/matching'
import { codeCompletionDefinition } from '../renderers/codeCompletion'

// All card-type definitions. The full Record type means adding a CardType
// without registering it here is a compile error — the registry is exhaustive.
const registry: { [T in CardType]: CardTypeDefinition<T> } = {
  basic: basicDefinition,
  codeReading: codeReadingDefinition,
  bugFinding: bugFindingDefinition,
  mcq: mcqDefinition,
  ordering: orderingDefinition,
  matching: matchingDefinition,
  codeCompletion: codeCompletionDefinition,
}

// Union-typed view of a definition. The single cast here widens the per-type
// generics; callers stay type-safe against the union.
export function getCardDefinition(type: CardType): CardTypeDefinition<CardType> {
  return registry[type] as CardTypeDefinition<CardType>
}

export type { CardTypeDefinition } from './types'
