import Dexie, { type Table } from 'dexie'
import {
  buildBackup,
  exportConfiguredBackup,
  getRepository,
  importBackup,
  type BackupFile,
} from '@fliptap/core'
import { findScenario, type ScenarioId } from './scenarios'

// Dev-only workspace switching. Loading a scenario replaces the Dexie workspace
// in one transaction (importBackup 'replace' on DexieRepository), so a failed
// load leaves the previous workspace intact.
//
// Real work is parked in a separate IndexedDB database before a scenario
// replaces it, so the app's own database is never the only copy. Scenarios
// are regenerated from code, so they are never parked: switching between them
// does not overwrite the parked session.

interface ParkedRow {
  key: 'last-session' | 'active'
  backup?: BackupFile
  activeScenario?: ScenarioId | 'live'
  savedAt?: number
}

class ParkingDB extends Dexie {
  rows!: Table<ParkedRow, string>

  constructor() {
    super('fliptap-dev-parking')
    this.version(1).stores({ rows: 'key' })
  }
}

const parking = new ParkingDB()

export async function getActiveWorkspace(): Promise<ScenarioId | 'live'> {
  const row = await parking.rows.get('active')
  return row?.activeScenario ?? 'live'
}

export async function hasParkedSession(): Promise<boolean> {
  return (await parking.rows.get('last-session')) !== undefined
}

// Only real work is parked. A scenario is already reproducible from code, so
// there is nothing to protect when one is replaced.
async function parkLiveWorkspace(): Promise<void> {
  if ((await getActiveWorkspace()) !== 'live') return
  const backup = await exportConfiguredBackup()
  await parking.rows.put({ key: 'last-session', backup, savedAt: Date.now() })
}

export async function loadScenario(id: ScenarioId): Promise<void> {
  const scenario = findScenario(id)
  if (!scenario) throw new Error(`Unknown scenario: ${id}`)

  await parkLiveWorkspace()
  const backup = buildBackup(scenario.build(Date.now()))
  await importBackup(getRepository(), backup, 'replace')
  await parking.rows.put({ key: 'active', activeScenario: id })
}

export async function restoreParkedSession(): Promise<void> {
  const row = await parking.rows.get('last-session')
  if (!row?.backup) throw new Error('No parked session to restore.')
  await importBackup(getRepository(), row.backup, 'replace')
  await parking.rows.put({ key: 'active', activeScenario: 'live' })
}
