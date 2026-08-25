import { iteraColors, iteraRadii } from '@itera/core'
import { StyleSheet, Text, View } from 'react-native'

import { monoFamily } from './monoFamily'

// The native code-block presentation, extracted verbatim from the styling the
// Recall preview screen carried inline so every renderer shows a fenced block
// the same way.
//
// Deliberately unhighlighted. The web viewer is CodeMirror, which mobile does
// not have and must not add (master plan D5a names a WebView CodeMirror an
// escape hatch, not a default), and the preview screens' per-token `tone`
// colouring was hand-authored per fixture - there is no shared tokenizer that
// could produce it from a `code` node, so real card content cannot be coloured
// without inventing one. Literal monospace text with line numbers is the honest
// rendering until a shared tokenizer exists.
//
// Lines wrap rather than scrolling horizontally, which is what the preview
// screens already did and what reads best in a narrow phone column.

export function NativeCodeBlock({ code, language }: { code: string; language: string }) {
  const lines = code.split('\n')
  // Two digits is the common case; widen rather than clipping a 3-digit gutter.
  const gutterWidth = 8 + String(lines.length).length * 7

  return (
    <View accessibilityLabel={`${language} code block`} style={styles.block}>
      <Text style={styles.language}>{language}</Text>
      {lines.map((line, index) => (
        <View key={index} style={styles.line}>
          <Text style={[styles.lineNumber, { width: gutterWidth }]}>{index + 1}</Text>
          <Text selectable style={styles.code}>
            {line}
          </Text>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  block: {
    width: '100%',
    borderRadius: iteraRadii.control,
    borderWidth: 1,
    borderColor: iteraColors.border,
    backgroundColor: iteraColors.surfaceSubtle,
    paddingHorizontal: 14,
    paddingTop: 24,
    paddingBottom: 12,
    gap: 9,
  },
  language: {
    position: 'absolute',
    top: 6,
    right: 10,
    color: iteraColors.mutedLight,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
  lineNumber: {
    color: iteraColors.mutedLight,
    fontFamily: monoFamily,
    fontSize: 12,
    lineHeight: 20,
    textAlign: 'right',
  },
  code: {
    flex: 1,
    color: iteraColors.inkBrand,
    fontFamily: monoFamily,
    fontSize: 12.5,
    lineHeight: 20,
  },
})
