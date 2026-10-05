import { describe, it, expect } from 'vitest'
import { buildBackup, parseBackup, serializeBackup } from '@fliptap/core'
import { SCENARIOS, findScenario } from './scenarios'

const NOW = new Date(2026, 9, 5, 14, 0, 0).getTime()

describe('dev scenarios', () => {
  it.each(SCENARIOS.map((s) => [s.id]))('%s passes the real backup validator', (id) => {
    const scenario = findScenario(id)!
    const json = serializeBackup(buildBackup(scenario.build(NOW)))
    expect(() => parseBackup(json)).not.toThrow()
  })

  it('blank has nothing in it', () => {
    const data = findScenario('blank')!.build(NOW)
    expect(data.cards).toHaveLength(0)
    expect(data.decks).toHaveLength(0)
    expect(data.reviewLogs).toHaveLength(0)
  })

  it('veteran references only decks and cards that exist', () => {
    const data = findScenario('veteran')!.build(NOW)
    const deckIds = new Set(data.decks.map((d) => d.id))
    const cardIds = new Set(data.cards.map((c) => c.id))
    expect(data.cards.every((c) => deckIds.has(c.deckId))).toBe(true)
    expect(data.reviewLogs.every((l) => cardIds.has(l.cardId))).toBe(true)
  })

  it('veteran has about three weeks of history with a gap', () => {
    const data = findScenario('veteran')!.build(NOW)
    const days = new Set(
      data.reviewLogs.map((l) => {
        const d = new Date(l.reviewedAt)
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      }),
    )
    expect(days.size).toBeGreaterThanOrEqual(15)
    expect(days.size).toBeLessThanOrEqual(21)
    const earliest = Math.min(...data.reviewLogs.map((l) => l.reviewedAt))
    expect(NOW - earliest).toBeLessThan(23 * 24 * 60 * 60 * 1000)
  })

  it('is deterministic for a given clock', () => {
    const a = findScenario('veteran')!.build(NOW)
    const b = findScenario('veteran')!.build(NOW)
    expect(a).toEqual(b)
  })
})
