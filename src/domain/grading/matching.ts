import type { ID } from '@/types/common'
import type { MatchingInteraction } from '@/types/card'

// sourceItemId -> columnId -> chosen itemId. Only non-source columns appear as
// keys; the source column's own id never does (it's the row key, not a cell).
export type MatchingResponse = Record<ID, Record<ID, ID>>

export interface MatchingCellResult {
  sourceItemId: ID
  columnId: ID
  correctItemId: ID
  chosenItemId: ID | undefined
  correct: boolean
}

export interface MatchingGrade {
  correct: boolean
  score: number // fraction of cells correct, 0..1
  cells: MatchingCellResult[]
}

// Generalizes across any number of columns and both fixed and unique
// (per-row) columns uniformly: every column's items carry a stable id (see
// cardV2.ts MatchingColumn), including fixed columns whose id is shared
// across rows — so grading is always "does the chosen item id equal the
// authored item id for this row+column," with no separate fixed-vs-unique
// branch (unlike the v1 matching renderer, which has to special-case fixed
// columns because its options are graded by string value). See
// docs/itera-decisions.md for this deliberate simplification.
export function gradeMatching(
  interaction: MatchingInteraction,
  response: MatchingResponse,
): MatchingGrade {
  const [sourceCol, ...otherCols] = interaction.columns
  const cells: MatchingCellResult[] = []

  for (const truthRow of interaction.relationships) {
    const sourceItemId = truthRow[sourceCol.id]
    if (sourceItemId == null) continue
    for (const col of otherCols) {
      const correctItemId = truthRow[col.id]
      if (correctItemId == null) continue
      const chosenItemId = response[sourceItemId]?.[col.id]
      cells.push({
        sourceItemId,
        columnId: col.id,
        correctItemId,
        chosenItemId,
        correct: chosenItemId === correctItemId,
      })
    }
  }

  const correctCount = cells.filter((c) => c.correct).length
  return {
    correct: cells.length > 0 && correctCount === cells.length,
    score: cells.length > 0 ? correctCount / cells.length : 1,
    cells,
  }
}

export function isMatchingResponseReady(
  interaction: MatchingInteraction,
  response: MatchingResponse,
): boolean {
  const [sourceCol, ...otherCols] = interaction.columns
  return interaction.relationships.every((truthRow) => {
    const sourceItemId = truthRow[sourceCol.id]
    if (sourceItemId == null) return true
    return otherCols.every((col) => {
      if (truthRow[col.id] == null) return true
      return response[sourceItemId]?.[col.id] != null
    })
  })
}
