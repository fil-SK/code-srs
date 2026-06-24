import type { CardType } from '@/types'
import type { CardTypeDefinition } from './types'
import { basicDefinition } from '../renderers/basic'
import { codeReadingDefinition } from '../renderers/codeReading'
import { bugFindingDefinition } from '../renderers/bugFinding'
import { mcqDefinition } from '../renderers/mcq'

// Registered card-type definitions. Partial while types are added across M3;
// tightened to a full Record (compile-time exhaustiveness) at the end of M3.
const registry: Partial<{ [T in CardType]: CardTypeDefinition<T> }> = {
  basic: basicDefinition,
  codeReading: codeReadingDefinition,
  bugFinding: bugFindingDefinition,
  mcq: mcqDefinition,
}

// The union-typed view of a definition. The single cast here is the one place
// the per-type generics are widened; callers stay type-safe against the union.
export function getCardDefinition(
  type: CardType,
): CardTypeDefinition<CardType> | undefined {
  return registry[type] as CardTypeDefinition<CardType> | undefined
}

export function isTypeImplemented(type: CardType): boolean {
  return type in registry
}

export type { CardTypeDefinition } from './types'
