import { iteraColors } from '@itera/core'
import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'

// A labelled row in an authoring form. The label is a real label: it carries a
// nativeID that the input inside points at with accessibilityLabelledBy, so a
// screen reader reads "Prompt" before the field's contents rather than reading
// an unnamed text box.
export function FormField({
  label,
  labelId,
  hint,
  optional = false,
  children,
}: {
  label: string
  labelId: string
  hint?: string
  optional?: boolean
  children: ReactNode
}) {
  return (
    <View style={styles.field}>
      <Text nativeID={labelId} style={styles.label}>
        {label}
        {optional ? <Text style={styles.optional}>{'  optional'}</Text> : null}
      </Text>
      {children}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  field: {
    marginTop: 18,
  },
  label: {
    marginBottom: 7,
    color: iteraColors.inkBrand,
    fontSize: 13,
    fontWeight: '700',
  },
  optional: {
    color: iteraColors.muted,
    fontSize: 12,
    fontWeight: '500',
  },
  hint: {
    marginTop: 6,
    color: iteraColors.muted,
    fontSize: 12,
    lineHeight: 17,
  },
})
