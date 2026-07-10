import { useState } from 'react'
import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react'
import type { StoryContent, StoryStep } from '@/types'
import { newId } from '@/lib/id'
import { Button } from '@/components/ui/Button'
import { CodeBlockField } from '@/components/code/CodeBlockField'
import { Field, fieldClass } from '@/components/ui/Field'
import type { EditorProps } from '../../registry/types'
import { ExplanationField } from '../Explanation'

const IMAGE_WARN_BYTES = 500 * 1024

export function StoryEditor({ content, onChange }: EditorProps<'story'>) {
  const [imgWarning, setImgWarning] = useState('')

  function update(patch: Partial<StoryContent>) {
    onChange({ ...content, ...patch })
  }

  function setStep(id: string, patch: Partial<StoryStep>) {
    update({
      steps: content.steps.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    })
  }

  function addStep() {
    update({ steps: [...content.steps, { id: newId(), prompt: '', answer: '' }] })
  }

  function removeStep(id: string) {
    update({ steps: content.steps.filter((s) => s.id !== id) })
  }

  function moveStep(index: number, delta: number) {
    const next = [...content.steps]
    const target = index + delta
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    update({ steps: next })
  }

  function readImage(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      update({ image: String(reader.result) })
      setImgWarning(
        file.size > IMAGE_WARN_BYTES
          ? `This image is ${Math.round(file.size / 1024)} KB and is stored inside the card. A smaller image keeps the database lean.`
          : '',
      )
    }
    reader.readAsDataURL(file)
  }

  const hasCode = content.code !== undefined

  return (
    <>
      <Field label="Intro (optional)">
        <textarea
          className={fieldClass}
          rows={2}
          value={content.intro ?? ''}
          onChange={(e) => update({ intro: e.target.value })}
          placeholder="Frame the assignment. Supports markdown."
        />
      </Field>

      {/* Shared context: an optional code listing pinned above every step. */}
      <label className="mt-1 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={hasCode}
          onChange={(e) =>
            update({
              code: e.target.checked ? { language: 'cpp', code: '' } : undefined,
            })
          }
        />
        <span className="font-medium">Include a shared code listing</span>
      </label>
      {content.code && (
        <CodeBlockField
          label="Shared code"
          value={content.code}
          onChange={(code) => update({ code })}
        />
      )}

      {/* Shared context: an optional image. */}
      <Field label="Shared image (optional)">
        <div
          className="rounded-[9px] border border-dashed border-border p-3"
          onPaste={(e) => {
            const file = Array.from(e.clipboardData.files).find((f) =>
              f.type.startsWith('image/'),
            )
            if (file) readImage(file)
          }}
        >
          {content.image ? (
            <div className="space-y-2">
              <img
                src={content.image}
                alt=""
                className="max-h-56 w-auto rounded-[8px] border border-border"
              />
              <button
                type="button"
                onClick={() => {
                  update({ image: undefined })
                  setImgWarning('')
                }}
                className="inline-flex items-center gap-1 text-xs text-muted hover:text-red"
              >
                <X size={13} /> Remove image
              </button>
            </div>
          ) : (
            <div className="text-xs text-muted">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) readImage(file)
                }}
                className="block text-text"
              />
              <span className="mt-1 block">or click here and paste an image</span>
            </div>
          )}
          {imgWarning && <p className="mt-2 text-xs text-amber">{imgWarning}</p>}
        </div>
      </Field>

      {/* The ordered steps. */}
      <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted">
        Steps
      </div>
      <div className="space-y-3">
        {content.steps.map((step, i) => (
          <div
            key={step.id}
            className="rounded-[10px] border border-border bg-panel-2 p-3"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-muted">Step {i + 1}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => moveStep(i, -1)}
                  disabled={i === 0}
                  className="rounded p-1 text-muted hover:text-text disabled:opacity-30"
                  aria-label="Move step up"
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => moveStep(i, 1)}
                  disabled={i === content.steps.length - 1}
                  className="rounded p-1 text-muted hover:text-text disabled:opacity-30"
                  aria-label="Move step down"
                >
                  <ArrowDown size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => removeStep(step.id)}
                  disabled={content.steps.length <= 1}
                  className="rounded p-1 text-muted hover:text-red disabled:opacity-30"
                  aria-label="Remove step"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <textarea
              className={fieldClass}
              rows={2}
              value={step.prompt}
              onChange={(e) => setStep(step.id, { prompt: e.target.value })}
              placeholder="What is being asked at this step? Supports markdown."
            />
            <textarea
              className={`${fieldClass} mt-2`}
              rows={3}
              value={step.answer}
              onChange={(e) => setStep(step.id, { answer: e.target.value })}
              placeholder="The answer revealed for this step."
            />

            <label className="mt-2 flex items-center gap-2 text-xs text-muted">
              <input
                type="checkbox"
                checked={step.code !== undefined}
                onChange={(e) =>
                  setStep(step.id, {
                    code: e.target.checked
                      ? { language: content.code?.language ?? 'cpp', code: '' }
                      : undefined,
                  })
                }
              />
              <span>Add code specific to this step</span>
            </label>
            {step.code && (
              <div className="mt-2">
                <CodeBlockField
                  label="Step code"
                  value={step.code}
                  onChange={(code) => setStep(step.id, { code })}
                />
              </div>
            )}
          </div>
        ))}
      </div>
      <Button variant="secondary" onClick={addStep} className="w-full">
        <Plus size={15} /> Add step
      </Button>

      <ExplanationField
        value={content.explanation}
        onChange={(explanation) => update({ explanation })}
      />
    </>
  )
}
