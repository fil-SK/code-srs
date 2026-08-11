import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { Button } from './Button'
import { fieldClass } from './Field'

export interface ConfirmOptions {
  title: string
  description?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

export interface PromptOptions {
  title: string
  description?: ReactNode
  label?: string
  placeholder?: string
  initialValue?: string
  confirmLabel?: string
}

export interface AlertOptions {
  title: string
  description?: ReactNode
  confirmLabel?: string
}

interface Dialogs {
  /** Resolves true when confirmed, false when dismissed. */
  confirm: (options: ConfirmOptions) => Promise<boolean>
  /** Resolves the trimmed value, or null when dismissed / left empty. */
  prompt: (options: PromptOptions) => Promise<string | null>
  /** Resolves once acknowledged. */
  alert: (options: AlertOptions) => Promise<void>
}

type Request =
  | { kind: 'confirm'; options: ConfirmOptions; resolve: (value: boolean) => void }
  | { kind: 'prompt'; options: PromptOptions; resolve: (value: string | null) => void }
  | { kind: 'alert'; options: AlertOptions; resolve: () => void }

const DialogContext = createContext<Dialogs | null>(null)

// In-app replacements for window.confirm / window.prompt / window.alert, which
// are OS-chrome modals that ignore the app's visual system entirely (and, in
// an installed PWA, look like a browser security prompt). Promise-based so
// call sites stay as straight-line as the blocking builtins they replace:
// `if (await dialogs.confirm({...})) …`.
export function DialogProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<Request | null>(null)

  // The resolver has to survive the close animation-free unmount below: it is
  // called exactly once, then cleared, so a dismissed dialog can never leave
  // an awaiting caller hanging.
  const settle = useCallback((apply: (req: Request) => void) => {
    setRequest((current) => {
      if (current) apply(current)
      return null
    })
  }, [])

  const dialogs = useMemo<Dialogs>(
    () => ({
      confirm: (options) =>
        new Promise<boolean>((resolve) => setRequest({ kind: 'confirm', options, resolve })),
      prompt: (options) =>
        new Promise<string | null>((resolve) => setRequest({ kind: 'prompt', options, resolve })),
      alert: (options) => new Promise<void>((resolve) => setRequest({ kind: 'alert', options, resolve })),
    }),
    [],
  )

  function cancel() {
    settle((req) => {
      if (req.kind === 'confirm') req.resolve(false)
      else if (req.kind === 'prompt') req.resolve(null)
      else req.resolve()
    })
  }

  return (
    <DialogContext.Provider value={dialogs}>
      {children}
      {request && (
        <DialogHost
          key={request.kind + request.options.title}
          request={request}
          onCancel={cancel}
          onSettle={settle}
        />
      )}
    </DialogContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDialogs(): Dialogs {
  const ctx = useContext(DialogContext)
  if (!ctx) throw new Error('useDialogs must be used inside a <DialogProvider>')
  return ctx
}

function DialogHost({
  request,
  onCancel,
  onSettle,
}: {
  request: Request
  onCancel: () => void
  onSettle: (apply: (req: Request) => void) => void
}) {
  const [value, setValue] = useState(request.kind === 'prompt' ? (request.options.initialValue ?? '') : '')
  const inputRef = useRef<HTMLInputElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const focusTarget = inputRef.current ?? confirmRef.current
    focusTarget?.focus()
    if (inputRef.current) inputRef.current.select()
  }, [])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onCancel])

  function submit() {
    onSettle((req) => {
      if (req.kind === 'confirm') req.resolve(true)
      else if (req.kind === 'prompt') req.resolve(value.trim() || null)
      else req.resolve()
    })
  }

  const { options } = request
  const danger = request.kind === 'confirm' && request.options.danger === true
  const confirmLabel =
    options.confirmLabel ??
    (request.kind === 'confirm' ? (danger ? 'Delete' : 'Confirm') : request.kind === 'prompt' ? 'Save' : 'OK')

  return createPortal(
    // Same reason as FloatingPanel: document.body is outside `.itera-scope`,
    // so the portal re-establishes the token scope and cancels the canvas
    // background the class would otherwise paint over the whole viewport.
    <div
      className="itera-scope"
      style={{ position: 'fixed', inset: 0, background: 'transparent', zIndex: 80 }}
      role="dialog"
      aria-modal="true"
      aria-label={options.title}
    >
      <div
        className="absolute inset-0 bg-[rgba(23,32,51,0.45)]"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div className="absolute inset-0 grid place-items-center overflow-auto p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
          className="relative w-full max-w-[420px] rounded-itera-dialog border border-itera-border bg-itera-surface p-6 shadow-[var(--itera-shadow-float)]"
        >
          <h2 className="font-itera-display text-lg font-bold tracking-tight text-itera-ink-brand">
            {options.title}
          </h2>
          {options.description && (
            <div className="mt-2 text-sm leading-relaxed text-itera-muted">{options.description}</div>
          )}

          {request.kind === 'prompt' && (
            <label className="mt-4 block">
              {request.options.label && (
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-itera-muted">
                  {request.options.label}
                </span>
              )}
              <input
                ref={inputRef}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={request.options.placeholder}
                className={fieldClass}
              />
            </label>
          )}

          <div className="mt-6 flex justify-end gap-2">
            {request.kind !== 'alert' && (
              <Button type="button" variant="secondary" onClick={onCancel}>
                {request.kind === 'confirm' ? (request.options.cancelLabel ?? 'Cancel') : 'Cancel'}
              </Button>
            )}
            <Button
              ref={confirmRef}
              type="submit"
              variant={danger ? 'danger' : 'primary'}
              disabled={request.kind === 'prompt' && value.trim() === ''}
            >
              {confirmLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}
