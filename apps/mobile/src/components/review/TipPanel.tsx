import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { iteraColors, iteraRadii, type RichContent } from '@itera/core'
import { StyleSheet, Text, View } from 'react-native'

import { RichTextNative } from '@/src/components/text/RichTextNative'

// Tip before the answer, Explanation after it - the same split web makes, and
// the same one the Recall preview screen made inline before this was shared.
//
// Both render real card text through the native renderer rather than a
// pre-tokenized fixture shape, so a card that has neither field simply renders
// nothing instead of the panel appearing empty.

export function TipPanel({ tip }: { tip: RichContent | undefined }) {
  if (!tip) return null

  return (
    <View style={styles.panel}>
      <View style={styles.icon}>
        <MaterialCommunityIcons color={iteraColors.accent} name="lightbulb-outline" size={24} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>Tip (optional)</Text>
        <RichTextNative style={styles.body} text={tip.value} />
      </View>
    </View>
  )
}

export function ExplanationPanel({ explanation }: { explanation: RichContent | undefined }) {
  if (!explanation) return null

  return (
    <View style={styles.panel}>
      <View style={[styles.icon, styles.iconExplanation]}>
        <MaterialCommunityIcons
          color={iteraColors.accentActive}
          name="book-open-variant"
          size={22}
        />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>Explanation</Text>
        <RichTextNative style={styles.body} text={explanation.value} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: iteraRadii.card,
    borderWidth: 1,
    borderColor: iteraColors.border,
    backgroundColor: iteraColors.surface,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: iteraColors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconExplanation: { backgroundColor: iteraColors.accentSofter },
  copy: { flex: 1, gap: 5 },
  title: { color: iteraColors.inkBrand, fontSize: 16, fontWeight: '700' },
  body: { color: iteraColors.muted, fontSize: 15, lineHeight: 23 },
})
