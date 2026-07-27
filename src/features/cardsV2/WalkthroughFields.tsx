import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Field, fieldClass, selectClass } from '@/components/ui/Field'
import { LazyCodeEditor } from '@/components/code/LazyCodeEditor'
import { SUPPORTED_LANGUAGES } from '@/components/code/languageList'
import {
  addWalkthroughAcceptedAnswer,
  addWalkthroughMcOption,
  addWalkthroughRange,
  addWalkthroughStep,
  moveWalkthroughMcOption,
  moveWalkthroughStep,
  removeWalkthroughAcceptedAnswer,
  removeWalkthroughMcOption,
  removeWalkthroughRange,
  removeWalkthroughStep,
  renameWalkthroughMcOption,
  setWalkthroughMcSelectionMode,
  setWalkthroughStepResponseType,
  toggleWalkthroughMcOptionCorrect,
  updateWalkthroughAcceptedAnswer,
  updateWalkthroughRange,
  updateWalkthroughRecallAnswer,
  updateWalkthroughStepPrompt,
  validateWalkthroughForm,
  type WalkthroughFormState,
} from '@/domain/cardsV2/walkthroughForm'
import { WalkthroughStepEditor } from './WalkthroughStepEditor'

const IMAGE_WARN_BYTES = 500 * 1024

// The centerpiece is the ordered step list (add/remove/reorder), each
// delegating its own response-type sub-editor to WalkthroughStepEditor —
// mirrors MatchingFields.tsx's composition (shared fields at the edges, a
// list of per-row sub-editors in the middle, mutation helpers imported from
// the domain module rather than local closures, for the same
// cascade-testability reason matchingForm.ts gives).
export function WalkthroughFields({
  form,
  onChange,
}: {
  form: WalkthroughFormState
  onChange: (next: WalkthroughFormState) => void
}) {
  const [imgWarning, setImgWarning] = useState('')

  function set<K extends keyof WalkthroughFormState>(key: K, value: WalkthroughFormState[K]) {
    onChange({ ...form, [key]: value })
  }

  function readImage(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      set('image', String(reader.result))
      setImgWarning(
        file.size > IMAGE_WARN_BYTES
          ? `This image is ${Math.round(file.size / 1024)} KB and is stored inside the card. A smaller image keeps the database lean.`
          : '',
      )
    }
    reader.readAsDataURL(file)
  }

  const validation = validateWalkthroughForm(form)

  return (
    <div className="space-y-4">
      <Field label="Prompt">
        <textarea
          className={fieldClass}
          rows={2}
          value={form.prompt}
          onChange={(e) => set('prompt', e.target.value)}
          placeholder="Trace what happens when this function runs."
        />
      </Field>

      <Field label="Shared scenario">
        <textarea
          className={fieldClass}
          rows={3}
          value={form.scenario}
          onChange={(e) => set('scenario', e.target.value)}
          placeholder="The context every step refers back to…"
        />
      </Field>

      <Field label="Language">
        <select
          className={selectClass}
          value={form.codeLanguage}
          onChange={(e) => set('codeLanguage', e.target.value)}
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <option key={lang.id} value={lang.id}>
              {lang.label}
            </option>
          ))}
        </select>
      </Field>

      <div className="space-y-1.5">
        <span className="block text-xs font-semibold uppercase tracking-wide text-itera-muted">
          Shared code (optional)
        </span>
        <LazyCodeEditor
          value={form.codeValue}
          language={form.codeLanguage}
          onChange={(value) => set('codeValue', value)}
        />
      </div>

      <Field label="Shared image (optional)">
        <div
          className="rounded-itera-control border border-dashed border-itera-border p-3"
          onPaste={(e) => {
            const file = Array.from(e.clipboardData.files).find((f) => f.type.startsWith('image/'))
            if (file) readImage(file)
          }}
        >
          {form.image ? (
            <div className="space-y-2">
              <img
                src={form.image}
                alt=""
                className="max-h-56 w-auto rounded-itera-control border border-itera-border"
              />
              <button
                type="button"
                onClick={() => {
                  set('image', undefined)
                  setImgWarning('')
                }}
                className="inline-flex items-center gap-1 text-xs text-itera-muted hover:text-itera-error"
              >
                <X size={13} /> Remove image
              </button>
            </div>
          ) : (
            <div className="text-xs text-itera-muted">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) readImage(file)
                }}
                className="block text-itera-ink"
              />
              <span className="mt-1 block">or click here and paste an image</span>
            </div>
          )}
          {imgWarning && <p className="mt-2 text-xs text-itera-warning">{imgWarning}</p>}
        </div>
      </Field>

      <div className="space-y-2">
        <span className="block text-xs font-semibold uppercase tracking-wide text-itera-muted">
          Steps
        </span>
        {form.steps.map((step, i) => (
          <WalkthroughStepEditor
            key={step.id}
            step={step}
            index={i}
            total={form.steps.length}
            canRemove={form.steps.length > 1}
            onPromptChange={(prompt) => onChange(updateWalkthroughStepPrompt(form, step.id, prompt))}
            onResponseTypeChange={(type) =>
              onChange(setWalkthroughStepResponseType(form, step.id, type))
            }
            onMoveUp={() => onChange(moveWalkthroughStep(form, step.id, -1))}
            onMoveDown={() => onChange(moveWalkthroughStep(form, step.id, 1))}
            onRemove={() => onChange(removeWalkthroughStep(form, step.id))}
            onAddRange={() => onChange(addWalkthroughRange(form, step.id))}
            onRangeChange={(rangeId, patch) =>
              onChange(updateWalkthroughRange(form, step.id, rangeId, patch))
            }
            onRemoveRange={(rangeId) => onChange(removeWalkthroughRange(form, step.id, rangeId))}
            onRecallAnswerChange={(answer) =>
              onChange(updateWalkthroughRecallAnswer(form, step.id, answer))
            }
            onMcSelectionModeChange={(mode) =>
              onChange(setWalkthroughMcSelectionMode(form, step.id, mode))
            }
            onAddMcOption={() => onChange(addWalkthroughMcOption(form, step.id))}
            onMcOptionTextChange={(optionId, text) =>
              onChange(renameWalkthroughMcOption(form, step.id, optionId, text))
            }
            onToggleMcOptionCorrect={(optionId) =>
              onChange(toggleWalkthroughMcOptionCorrect(form, step.id, optionId))
            }
            onMoveMcOptionUp={(optionId) =>
              onChange(moveWalkthroughMcOption(form, step.id, optionId, -1))
            }
            onMoveMcOptionDown={(optionId) =>
              onChange(moveWalkthroughMcOption(form, step.id, optionId, 1))
            }
            onRemoveMcOption={(optionId) =>
              onChange(removeWalkthroughMcOption(form, step.id, optionId))
            }
            onAddAcceptedAnswer={() => onChange(addWalkthroughAcceptedAnswer(form, step.id))}
            onAcceptedAnswerChange={(answerId, text) =>
              onChange(updateWalkthroughAcceptedAnswer(form, step.id, answerId, text))
            }
            onRemoveAcceptedAnswer={(answerId) =>
              onChange(removeWalkthroughAcceptedAnswer(form, step.id, answerId))
            }
          />
        ))}
        <Button type="button" variant="ghost" onClick={() => onChange(addWalkthroughStep(form))}>
          <Plus size={14} /> Add step
        </Button>
      </div>

      {validation.errors.length > 0 && (
        <ul className="space-y-1 text-xs font-medium text-itera-error">
          {validation.errors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tip (optional)">
          <textarea
            className={fieldClass}
            rows={2}
            value={form.tip}
            onChange={(e) => set('tip', e.target.value)}
            placeholder="A short hint to help narrow it down…"
          />
        </Field>
        <Field label="Explanation (optional)">
          <textarea
            className={fieldClass}
            rows={2}
            value={form.explanation}
            onChange={(e) => set('explanation', e.target.value)}
            placeholder="Why this walkthrough works the way it does…"
          />
        </Field>
      </div>
    </div>
  )
}
