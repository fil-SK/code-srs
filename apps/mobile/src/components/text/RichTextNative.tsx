import { parseRichInline, parseRichText, iteraColors, type RichInline } from '@itera/core'
import { Fragment } from 'react'
import { StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native'

import { NativeCodeBlock } from './NativeCodeBlock'
import { monoFamily } from './monoFamily'

// The native renderer for Itera's card-text syntax.
//
// It maps the semantic nodes @itera/core produces onto React Native elements
// and does no parsing of its own: what `**bold**`, `*italic*`, `` `code` `` and
// a fenced block mean is decided once, in
// packages/core/src/content/parseRichText.ts. The web renderer
// (apps/web/src/components/text/RichText.tsx) maps the same tree onto DOM, so
// the two platforms cannot disagree about the syntax. This file emits React
// Native elements, so it stays here - a renderer is platform-specific by
// definition.
//
// Card content is data, never markup. Every node value is handed to <Text> as a
// text child, which React Native renders as characters and never as markup:
// there is no innerHTML equivalent here, no WebView, and no Linking. Attack
// strings and educational content are the same case - `<script>`, `Vec<T>` and
// `a < b && c > d` all render literally, and nothing is stripped or rewritten.
// richTextSecurity.test.tsx locks that.

function renderInline(nodes: RichInline[], key: string) {
  return nodes.map((node, index) => {
    const k = `${key}-i${index}`
    switch (node.kind) {
      case 'inlineCode':
        return (
          <Text key={k} style={styles.inlineCode}>
            {node.value}
          </Text>
        )
      case 'strong':
        return (
          <Text key={k} style={styles.strong}>
            {node.value}
          </Text>
        )
      case 'em':
        return (
          <Text key={k} style={styles.em}>
            {node.value}
          </Text>
        )
      case 'text':
        return <Fragment key={k}>{node.value}</Fragment>
    }
  })
}

/**
 * Inline-only variant for short labels (multiple-choice options, ordering items,
 * matching cells): renders inline code, bold and italic with no block or fenced
 * handling, so it drops straight inside a caller's own <Text>.
 *
 * `style` carries the caller's typography and applies to the whole run.
 */
export function RichInlineNative({
  text,
  style,
}: {
  text: string
  style?: StyleProp<TextStyle>
}) {
  return <Text style={style}>{renderInline(parseRichInline(text), 'il')}</Text>
}

/**
 * Renders a card text field: fenced code blocks plus prose paragraphs.
 *
 * `style` carries the field's own typography (size, weight, alignment) and
 * applies to the prose, not to code blocks - the same split the web renderer's
 * `className` makes.
 */
export function RichTextNative({
  text,
  style,
}: {
  text: string
  style?: StyleProp<TextStyle>
}) {
  const blocks = parseRichText(text)

  return (
    <View style={styles.blocks}>
      {blocks.map((block, index) =>
        block.kind === 'code' ? (
          <NativeCodeBlock key={index} code={block.value} language={block.language} />
        ) : (
          <Text key={index} style={style}>
            {renderInline(block.children, `b${index}`)}
          </Text>
        ),
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  blocks: { width: '100%', gap: 14 },
  strong: { fontWeight: '700' },
  em: { fontStyle: 'italic' },
  inlineCode: { color: iteraColors.accent, fontFamily: monoFamily, fontWeight: '700' },
})
