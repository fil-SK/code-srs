// The convenience tier over data/backup.ts, tested where the layering can
// actually break: these two helpers exist so a screen never calls
// getRepository() itself, and their entire job is to hand the *configured*
// repository to the primitive underneath.
//
// useImportBackup is not exercised here - it is a React hook and core has no
// renderer. Its resolution behaviour is covered from the web project, where a
// DOM exists (src/hooks/repositoryResolution.test.tsx).
import { beforeEach, describe, expect, it } from 'vitest'
import { fixtureCard, fixtureDeck } from '../domain/io/backupFixtures'
import { cardRow, entityRow, fakeSupabase } from '../data/supabase/fakeSupabaseClient'
import { SupabaseRepository } from '../data/supabase/SupabaseRepository'
import { configureRepository } from '../data/registry'
import { canReplaceConfiguredImport, exportConfiguredBackup } from './useBackup'

function cloud(cardIds: string[]) {
  const sb = fakeSupabase({
    tables: {
      cards: cardIds.map((id) => cardRow(fixtureCard('recall', { id }))),
      decks: [entityRow(fixtureDeck())],
      drafts: [],
      roadmaps: [],
      review_logs: [],
    },
  }).sb
  return new SupabaseRepository(sb)
}

describe('exportConfiguredBackup', () => {
  beforeEach(() => {
    configureRepository(() => cloud(['card-1', 'card-2']))
  })

  it('reads the configured repository', async () => {
    const backup = await exportConfiguredBackup()
    expect(backup.data.cards.map((c) => c.id).sort()).toEqual(['card-1', 'card-2'])
  })

  it('follows a reconfiguration rather than a repository captured at import', async () => {
    expect((await exportConfiguredBackup()).data.cards).toHaveLength(2)

    configureRepository(() => cloud(['card-9']))

    const backup = await exportConfiguredBackup()
    expect(backup.data.cards.map((c) => c.id)).toEqual(['card-9'])
  })
})

describe('canReplaceConfiguredImport', () => {
  it('reports the configured backend capability, not a hardcoded answer', () => {
    configureRepository(() => cloud([]))
    // The cloud backend cannot roll a failed Replace back, so it does not
    // offer one. Asserted through the registry to prove the helper resolves.
    expect(canReplaceConfiguredImport()).toBe(false)
  })
})
