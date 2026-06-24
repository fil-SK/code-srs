import { useState } from 'react'
import type { Card, ID, Rating } from '@/types'
import { useGradeCard, useUndoGrade } from '@/hooks/useReview'

interface UndoEntry {
  card: Card // original card (pre-grade)
  logId: ID
}

// Drives one study session over a fixed snapshot of due cards:
// Presenting -> Answered (revealed) -> Scheduled (graded) -> next, with undo.
// The queue is snapshotted at mount so grading (which moves a card's due date)
// doesn't reshuffle the session under us.
export function useReviewSession(initialQueue: Card[]) {
  const [queue] = useState(() => initialQueue)
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [presentedAt, setPresentedAt] = useState(() => Date.now())
  const [undoStack, setUndoStack] = useState<UndoEntry[]>([])

  const grade = useGradeCard()
  const undo = useUndoGrade()

  const current: Card | undefined = queue[index]
  const isComplete = index >= queue.length
  const busy = grade.isPending || undo.isPending

  function reveal() {
    setRevealed(true)
  }

  // Flip back to the question without grading (self-graded flip cards).
  function flipBack() {
    setRevealed(false)
  }

  function goTo(nextIndex: number, nextRevealed: boolean) {
    setIndex(nextIndex)
    setRevealed(nextRevealed)
    setPresentedAt(Date.now())
  }

  async function submitGrade(rating: Rating, autoGraded = false) {
    if (!current || busy) return
    const durationMs = Date.now() - presentedAt
    const { log } = await grade.mutateAsync({
      card: current,
      rating,
      durationMs,
      autoGraded,
    })
    setUndoStack((s) => [...s, { card: current, logId: log.id }])
    goTo(index + 1, false)
  }

  async function undoLast() {
    const entry = undoStack[undoStack.length - 1]
    if (!entry || busy) return
    await undo.mutateAsync(entry)
    setUndoStack((s) => s.slice(0, -1))
    goTo(Math.max(0, index - 1), true) // show the card again, answer revealed
  }

  return {
    current,
    index,
    total: queue.length,
    reviewedCount: index,
    revealed,
    isComplete,
    busy,
    canUndo: undoStack.length > 0,
    reveal,
    flipBack,
    submitGrade,
    undoLast,
  }
}
