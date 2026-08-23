import { Fragment, type ReactNode } from 'react'
import { parseRichInline, parseRichText, type RichInline } from '@itera/core'
import { LazyCodeView } from '@/components/code/LazyCodeView'

// The web renderer for Itera's card-text syntax. It maps the semantic nodes
// @itera/core produces onto DOM elements and does no parsing of its own -
// what `**bold**`, `*italic*`, `` `code` `` and a fenced block mean is decided
// once, in packages/core/src/content/parseRichText.ts, so a future native
// renderer maps the same tree rather than re-implementing the rules. This file
// emits DOM, so it stays here: a renderer is platform-specific by definition.
//
// Card content is data, never markup. Every node's value is handed to React as
// a text child, so it is escaped by construction; there is no
// dangerouslySetInnerHTML here and none may appear anywhere in src/ (a source
// scan in renderingSinks.test.ts enforces that). Attack strings and
// educational content are the same case: `<script>`, generics like Vec<T> and
// `a < b && c > d` all render literally, and nothing is stripped or rewritten.

function renderInline(nodes: RichInline[], key: string): ReactNode[] {
  return nodes.map((node, i) => {
    const k = `${key}-i${i}`
    switch (node.kind) {
      case 'inlineCode':
        return (
          <code
            key={k}
            className="rounded-[5px] bg-panel-2 px-1.5 py-0.5 font-mono text-[0.875em] text-accent"
          >
            {node.value}
          </code>
        )
      case 'strong':
        return <strong key={k}>{node.value}</strong>
      case 'em':
        return <em key={k}>{node.value}</em>
      case 'text':
        return <Fragment key={k}>{node.value}</Fragment>
    }
  })
}

// Inline-only variant for short labels (MCQ options, ordering and matching
// items): renders `code`, **bold** and *italic* with no block/fenced handling
// and no wrapping element, so it drops straight into a <span>, <li> or
// <button>.
export function InlineText({ text }: { text: string }) {
  return <>{renderInline(parseRichInline(text), 'il')}</>
}

// Renders a card text field. `className` carries the field's own typography
// (size/weight); it applies to the prose, not to code blocks.
export function RichText({
  text,
  className,
}: {
  text: string
  className?: string
}) {
  return (
    <div className={className}>
      {parseRichText(text).map((block, i) =>
        block.kind === 'code' ? (
          <div key={i} className="my-2 text-left first:mt-0 last:mb-0">
            <LazyCodeView code={block.value} language={block.language} />
          </div>
        ) : (
          <div key={i} className="whitespace-pre-wrap">
            {renderInline(block.children, `b${i}`)}
          </div>
        ),
      )}
    </div>
  )
}
