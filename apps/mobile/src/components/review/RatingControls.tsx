import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { iteraColors, iteraRadii, type Rating } from '@itera/core'
import type { ComponentProps } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name']

const ratingPresentation: {
  rating: Rating
  label: string
  icon: IconName
  accent: string
}[] = [
  { rating: 1, label: 'Again', icon: 'refresh', accent: '#ef4444' },
  { rating: 2, label: 'Hard', icon: 'chart-bar', accent: '#f59e0b' },
  { rating: 3, label: 'Good', icon: 'check-circle-outline', accent: '#65a30d' },
  { rating: 4, label: 'Easy', icon: 'chevron-double-right', accent: '#2563eb' },
]

// The final grade, which the learner always chooses.
//
// Itera's locked rule is that objective correctness is not recall quality: a
// card can be answered correctly after a struggle, or missed on something the
// learner otherwise knows cold. So an auto-graded result may *recommend* a
// rating - shown here as a "Suggested" marker - and never selects one, never
// disables the others, and never advances the session on its own.
//
// The intervals are real: the host computes them from the shared scheduler's
// preview of this card's own state, replacing the four fixture strings every
// preview screen used to show identically.

export function RatingControls({
  intervals,
  selected,
  suggested,
  disabled,
  onRate,
}: {
  intervals: Record<Rating, string>
  selected: Rating | null
  suggested: Rating | null
  disabled: boolean
  onRate: (rating: Rating) => void
}) {
  return (
    <View>
      <Text style={styles.heading}>How well did you recall it?</Text>
      <View style={styles.grid}>
        {ratingPresentation.map((item) => {
          const isSelected = selected === item.rating
          const isSuggested = suggested === item.rating && selected === null
          return (
            <Pressable
              key={item.rating}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected, disabled }}
              accessibilityLabel={`${item.label}, ${intervals[item.rating]}${
                isSuggested ? ', suggested' : ''
              }`}
              disabled={disabled}
              onPress={() => onRate(item.rating)}
              style={({ pressed }) => [
                styles.button,
                isSuggested && styles.buttonSuggested,
                isSelected && styles.buttonSelected,
                disabled && !isSelected && styles.buttonDisabled,
                pressed && styles.pressed,
              ]}
            >
              {isSuggested && <Text style={styles.suggested}>Suggested</Text>}
              <MaterialCommunityIcons
                color={isSelected || isSuggested ? iteraColors.accent : iteraColors.muted}
                name={item.icon}
                size={24}
              />
              <Text style={styles.label}>{item.label}</Text>
              <Text style={styles.interval}>
                {item.rating} • {intervals[item.rating]}
              </Text>
              <View style={[styles.accent, { backgroundColor: item.accent }]} />
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  heading: {
    marginBottom: 10,
    color: iteraColors.inkBrand,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  grid: { flexDirection: 'row', gap: 8 },
  button: {
    flex: 1,
    minHeight: 118,
    overflow: 'hidden',
    borderRadius: iteraRadii.control,
    borderWidth: 1,
    borderColor: iteraColors.border,
    backgroundColor: iteraColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  buttonSuggested: { borderColor: iteraColors.accent, backgroundColor: iteraColors.accentSoft },
  buttonSelected: { borderColor: iteraColors.accent, backgroundColor: iteraColors.accentSofter },
  buttonDisabled: { opacity: 0.5 },
  suggested: {
    position: 'absolute',
    top: 8,
    color: iteraColors.accentActive,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  label: { color: iteraColors.inkBrand, fontSize: 14, fontWeight: '700' },
  interval: { color: iteraColors.muted, fontSize: 11 },
  accent: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 4 },
  pressed: { opacity: 0.68 },
})
