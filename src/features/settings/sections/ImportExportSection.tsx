import { useRef, useState } from 'react'
import { Download, Upload } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useDialogs } from '@/components/ui/dialogs'
import { exportBackup, type ImportMode } from '@/data/backup'
import { parseBackup, serializeBackup } from '@/domain/io/backup'
import { downloadText } from '@/lib/download'
import { useImportBackup } from '@/hooks/useBackup'
import { Panel, SectionShell } from './SectionShell'

// A real, working section — this is the app's only backup/restore path and it
// predates the redesign; it moved here from the old SettingsPage unchanged
// except for the confirm dialog, which now goes through useDialogs like the
// rest of the app instead of window.confirm (docs/itera-decisions.md D114).
export function ImportExportSection() {
  const dialogs = useDialogs()
  const importBackup = useImportBackup()
  const fileRef = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<ImportMode>('merge')
  const [status, setStatus] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  async function handleExport() {
    const backup = await exportBackup()
    const date = new Date().toISOString().slice(0, 10)
    // Filename only. The `app` marker *inside* the file stays 'code-srs' so
    // every backup exported before the rebrand still imports (backup.ts).
    downloadText(`itera-backup-${date}.json`, serializeBackup(backup))
  }

  async function handleFile(file: File) {
    setStatus(null)
    try {
      const backup = parseBackup(await file.text())
      if (
        mode === 'replace' &&
        !(await dialogs.confirm({
          title: 'Replace all current data?',
          description:
            'Everything currently stored — cards, decks, drafts, review history — is discarded and replaced with this backup. This cannot be undone.',
          confirmLabel: 'Replace everything',
          danger: true,
        }))
      ) {
        return
      }
      await importBackup.mutateAsync({ backup, mode })
      const { cards, decks, drafts } = backup.data
      setStatus({
        kind: 'ok',
        text: `Imported ${cards.length} cards, ${decks.length} decks, ${drafts.length} drafts.`,
      })
    } catch (e) {
      setStatus({ kind: 'err', text: (e as Error).message })
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <SectionShell
      title="Import / Export"
      description="Your backup, and the way to move data between devices."
    >
      <Panel>
        <p className="mb-4 text-sm text-itera-muted">
          Everything is stored locally in your browser (IndexedDB). Export writes a single JSON
          file containing your cards, decks, drafts, review history and roadmaps.
        </p>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button onClick={handleExport}>
            <Download size={15} aria-hidden="true" /> Export JSON
          </Button>

          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFile(file)
            }}
          />
          <Button
            variant="secondary"
            onClick={() => fileRef.current?.click()}
            disabled={importBackup.isPending}
          >
            <Upload size={15} aria-hidden="true" />{' '}
            {importBackup.isPending ? 'Importing…' : 'Import JSON'}
          </Button>

          <label className="flex items-center gap-1.5 text-sm text-itera-muted">
            <input
              type="radio"
              name="import-mode"
              checked={mode === 'merge'}
              onChange={() => setMode('merge')}
            />
            Merge
          </label>
          <label className="flex items-center gap-1.5 text-sm text-itera-muted">
            <input
              type="radio"
              name="import-mode"
              checked={mode === 'replace'}
              onChange={() => setMode('replace')}
            />
            Replace
          </label>
        </div>

        {status && (
          <p
            className={`mt-3 text-sm ${status.kind === 'ok' ? 'text-itera-success' : 'text-itera-error'}`}
          >
            {status.text}
          </p>
        )}
      </Panel>
    </SectionShell>
  )
}
