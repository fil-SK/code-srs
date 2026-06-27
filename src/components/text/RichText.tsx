import { Fragment, type ReactNode } from 'react'
import { LazyCodeView } from '@/components/code/LazyCodeView'

// Light markdown for card prose: fenced ```lang code``` blocks (rendered with
// the app's CodeMirror viewer) plus inline `code`, **bold**, and *italic*.
// Nodes are built directly (no dangerouslySetInnerHTML), so it is XSS-safe.
// Identifier-friendly: underscores are left alone, so snake_case stays literal.

const FENCE = /```(\w*)[^\n]*\n([\s\S]*?)```/g

interface Block {
  type: 'code' | 'text'
  lang?: string
  body: string
}

function splitBlocks(src: string): Block[] {
  const blocks: Block[] = []
  let last = 0
  let m: RegExpExecArray | null
  FENCE.lastIndex = 0
  while ((m = FENCE.exec(src))) {
    if (m.index > last) {
      blocks.push({ type: 'text', body: src.slice(last, m.index) })
    }
    blocks.push({ type: 'code', lang: m[1] || 'text', body: m[2].replace(/\n$/, '') })
    last = m.index + m[0].length
  }
  if (last < src.length) blocks.push({ type: 'text', body: src.slice(last) })
  return blocks
}

// Inline emphasis inside a plain (non-code) run. Bold first so ** wins over *.
function emphasis(text: string, key: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*)/g)
  return parts.map((p, i) => {
    const k = `${key}-e${i}`
    if (/^\*\*[^*\n]+\*\*$/.test(p)) return <strong key={k}>{p.slice(2, -2)}</strong>
    if (/^\*[^*\n]+\*$/.test(p)) return <em key={k}>{p.slice(1, -1)}</em>
    return <Fragment key={k}>{p}</Fragment>
  })
}

// Inline `code` takes precedence over emphasis; its contents stay literal.
function inline(text: string, key: string): ReactNode[] {
  const parts = text.split(/(`[^`\n]+`)/g)
  return parts.map((p, i) => {
    const k = `${key}-i${i}`
    if (/^`[^`\n]+`$/.test(p)) {
      return (
        <code
          key={k}
          className="rounded-[5px] bg-panel-2 px-1.5 py-0.5 font-mono text-[0.875em] text-accent"
        >
          {p.slice(1, -1)}
        </code>
      )
    }
    return <Fragment key={k}>{emphasis(p, k)}</Fragment>
  })
}

// Inline-only variant for short labels (MCQ options, list items): renders
// `code`, **bold**, and *italic* with no block/fenced handling and no wrapping
// element, so it drops straight into a <span>, <li>, or <button>.
export function InlineText({ text }: { text: string }) {
  return <>{inline(text, 'il')}</>
}

// Renders a card text field with light markdown. `className` carries the field's
// own typography (size/weight); it applies to the prose, not to code blocks.
export function RichText({
  text,
  className,
}: {
  text: string
  className?: string
}) {
  const blocks = splitBlocks(text).filter(
    (b) => b.type === 'code' || b.body.replace(/^\n+|\n+$/g, '').length > 0,
  )
  return (
    <div className={className}>
      {blocks.map((b, i) =>
        b.type === 'code' ? (
          <div key={i} className="my-2 first:mt-0 last:mb-0">
            <LazyCodeView code={b.body} language={b.lang ?? 'text'} />
          </div>
        ) : (
          <div key={i} className="whitespace-pre-wrap">
            {inline(b.body.replace(/^\n+|\n+$/g, ''), `b${i}`)}
          </div>
        ),
      )}
    </div>
  )
}
