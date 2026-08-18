import type { ID } from '@/types/common'
import type { OrderingInteraction } from '@/types/card'

export interface OrderingPositionResult {
  itemId: ID
  submittedIndex: number
  correctIndex: number
  correct: boolean
}

export interface OrderingGrade {
  correct: boolean
  score: number // fraction of items in their correct position, 0..1
  positions: OrderingPositionResult[]
}

// Position-wise grading (not "is this a valid permutation somewhere else") —
// an item is correct only if it sits at its authored index, matching how the
// feedback view highlights individual rows.
export function gradeOrdering(
  interaction: OrderingInteraction,
  order: ID[],
): OrderingGrade {
  const positions = order.map((itemId, submittedIndex) => {
    const correctIndex = interaction.correctOrder.indexOf(itemId)
    return {
      itemId,
      submittedIndex,
      correctIndex,
      correct: submittedIndex === correctIndex,
    }
  })
  const correctCount = positions.filter((p) => p.correct).length
  const total = interaction.correctOrder.length
  return {
    correct: total > 0 && correctCount === total && order.length === total,
    score: total > 0 ? correctCount / total : 1,
    positions,
  }
}

export function isOrderingResponseReady(
  interaction: OrderingInteraction,
  order: ID[] | undefined,
): boolean {
  if (!Array.isArray(order) || order.length !== interaction.items.length) return false
  return new Set(order).size === order.length
}
