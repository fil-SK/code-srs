import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { iteraColors, iteraRadii } from '@itera/core'
import type { Rating } from '@itera/core'
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

export function PreviewRatingControls({
  intervals,
  selected,
  onSelect,
}: {
  intervals: Record<Rating, string>
  selected: Rating | null
  onSelect: (rating: Rating) => void
}) {
  return (
    <View>
      <Text style={styles.heading}>How well did you recall it?</Text>
      <View style={styles.grid}>
        {ratingPresentation.map((item) => {
          const isSelected = selected === item.rating
          return (
            <Pressable
              key={item.rating}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${item.label}, ${intervals[item.rating]}`}
              onPress={() => onSelect(item.rating)}
              style={({ pressed }) => [
                styles.button,
                isSelected && styles.buttonSelected,
                pressed && styles.pressed,
              ]}
            >
              <MaterialCommunityIcons
                color={isSelected ? iteraColors.accent : iteraColors.muted}
                name={item.icon}
                size={24}
              />
              <Text style={styles.label}>{item.label}</Text>
              <Text style={styles.interval}>{item.rating} • {intervals[item.rating]}</Text>
              <View style={[styles.accent, { backgroundColor: item.accent }]} />
            </Pressable>
          )
        })}
      </View>
      <Text style={styles.note}>Preview only. Ratings are not saved.</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  heading: { marginBottom: 10, color: iteraColors.inkBrand, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  grid: { flexDirection: 'row', gap: 8 },
  button: { flex: 1, minHeight: 118, overflow: 'hidden', borderRadius: iteraRadii.control, borderWidth: 1, borderColor: iteraColors.border, backgroundColor: iteraColors.surface, alignItems: 'center', justifyContent: 'center', gap: 6 },
  buttonSelected: { borderColor: iteraColors.accent, backgroundColor: iteraColors.accentSofter },
  label: { color: iteraColors.inkBrand, fontSize: 14, fontWeight: '700' },
  interval: { color: iteraColors.muted, fontSize: 11 },
  accent: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 4 },
  note: { marginTop: 9, color: iteraColors.muted, fontSize: 12, textAlign: 'center' },
  pressed: { opacity: 0.68 },
})
