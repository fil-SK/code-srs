import { useRef, useState } from 'react'
import { Download, Upload } from 'lucide-react'
import { useTheme } from '@/app/theme'
import { Button } from '@/components/ui/Button'
import { exportBackup, type ImportMode } from '@/data/backup'
import { parseBackup, serializeBackup } from '@/domain/io/backup'
import { downloadText } from '@/lib/download'
import { useImportBackup } from '@/hooks/useBackup'

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-card border border-border bg-panel p-5">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="mt-3">{children}</div>
    </div>
  )
}

export function SettingsPage() {
  const { theme, toggle } = useTheme()
  const importBackup = useImportBackup()
  const fileRef = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<ImportMode>('merge')
  const [status, setStatus] = useState<{ kind: 'ok' | 'err'; text: string } | null>(
    null,
  )

  async function handleExport() {
    const backup = await exportBackup()
    const date = new Date().toISOString().slice(0, 10)
    downloadText(`code-srs-backup-${date}.json`, serializeBackup(backup))
  }

  async function handleFile(file: File) {
    setStatus(null)
    try {
      const backup = parseBackup(await file.text())
      if (
        mode === 'replace' &&
        !window.confirm('Replace ALL current data with this backup? This cannot be undone.')
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
    <div className="max-w-2xl space-y-4">
      <Section title="Appearance">
        <p className="mb-3 text-sm text-muted">
          Currently {theme} mode. Defaults to dark.
        </p>
        <Button onClick={toggle}>Switch to {theme === 'dark' ? 'light' : 'dark'} mode</Button>
      </Section>

      <Section title="Scheduler (FSRS)">
        <p className="text-sm text-muted">
          Reviews are scheduled with FSRS. Configurable parameters (daily new-card
          limit, target retention) land in a later milestone.
        </p>
      </Section>

      <Section title="Data">
        <p className="mb-3 text-sm text-muted">
          Everything is stored locally in your browser (IndexedDB). Export is your
          backup and the way to move data between devices.
        </p>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button onClick={handleExport}>
            <Download size={15} /> Export JSON
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
            <Upload size={15} /> {importBackup.isPending ? 'Importing…' : 'Import JSON'}
          </Button>

          <label className="flex items-center gap-1.5 text-sm text-muted">
            <input
              type="radio"
              name="import-mode"
              checked={mode === 'merge'}
              onChange={() => setMode('merge')}
            />
            Merge
          </label>
          <label className="flex items-center gap-1.5 text-sm text-muted">
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
            className={`mt-3 text-sm ${status.kind === 'ok' ? 'text-green' : 'text-red'}`}
          >
            {status.text}
          </p>
        )}
      </Section>
    </div>
  )
}
