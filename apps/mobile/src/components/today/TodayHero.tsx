import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { iteraColors } from '@itera/core'
import { useFocusEffect } from 'expo-router'
import type { ComponentProps } from 'react'
import { useCallback, useRef } from 'react'
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'

import type { MobileTodayViewModel } from '@/src/types/today'

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name']

interface MetricProps {
  icon: IconName
  iconColor: string
  label: string
  value: string
  suffix?: string
}

function Metric({ icon, iconColor, label, value, suffix }: MetricProps) {
  return (
    <View style={styles.metric}>
      <View style={styles.metricIcon}>
        <MaterialCommunityIcons color={iconColor} name={icon} size={31} />
      </View>
      <View style={styles.metricCopy}>
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.85}
          numberOfLines={1}
          style={styles.metricLabel}
        >
          {label}
        </Text>
        <Text adjustsFontSizeToFit numberOfLines={1} style={styles.metricValue}>
          {value}
          {suffix ? <Text style={styles.metricSuffix}> {suffix}</Text> : null}
        </Text>
      </View>
    </View>
  )
}

interface TodayHeroProps {
  dueToday: MobileTodayViewModel['dueToday']
  streak: MobileTodayViewModel['streak']
  retention: MobileTodayViewModel['retention']
  estimatedMinutes: MobileTodayViewModel['estimatedMinutes']
  onStartSession: () => void
  onBrowseLibrary: () => void
}

export function TodayHero({
  dueToday,
  streak,
  retention,
  estimatedMinutes,
  onStartSession,
  onBrowseLibrary,
}: TodayHeroProps) {
  // Nothing due is a real state, and no session can create work. The hero keeps
  // its one action in its one slot; only the label and the destination change,
  // which is the same call web's SuggestedSessionHero makes when the queue is
  // empty. Composition, metrics and geometry are untouched.
  const caughtUp = dueToday === 0
  const backPlacement = useRef(new Animated.Value(0)).current
  const nearPlacement = useRef(new Animated.Value(0)).current
  const frontPlacement = useRef(new Animated.Value(0)).current

  useFocusEffect(
    useCallback(() => {
      let cancelled = false
      backPlacement.setValue(0)
      nearPlacement.setValue(0)
      frontPlacement.setValue(0)

      const placement = Animated.sequence([
        Animated.delay(100),
        Animated.stagger(130, [
          Animated.timing(backPlacement, {
            toValue: 1,
            duration: 280,
            easing: Easing.bezier(0.22, 1, 0.36, 1),
            useNativeDriver: true,
          }),
          Animated.timing(nearPlacement, {
            toValue: 1,
            duration: 280,
            easing: Easing.bezier(0.22, 1, 0.36, 1),
            useNativeDriver: true,
          }),
          Animated.timing(frontPlacement, {
            toValue: 1,
            duration: 280,
            easing: Easing.bezier(0.22, 1, 0.36, 1),
            useNativeDriver: true,
          }),
        ]),
      ])

      AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
        if (cancelled) return
        if (reduceMotion) {
          backPlacement.setValue(1)
          nearPlacement.setValue(1)
          frontPlacement.setValue(1)
          return
        }
        placement.start()
      })

      return () => {
        cancelled = true
        placement.stop()
      }
    }, [backPlacement, frontPlacement, nearPlacement]),
  )

  return (
    <View style={styles.stack}>
      <Animated.View
        style={[
          styles.rearCard,
          styles.rearCardBack,
          {
            opacity: backPlacement,
            transform: [
              {
                translateY: backPlacement.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-29, 7],
                }),
              },
              { rotate: '-4.5deg' },
              {
                scale: backPlacement.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1.04, 1],
                }),
              },
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.rearCard,
          styles.rearCardNear,
          {
            opacity: nearPlacement,
            transform: [
              {
                translateY: nearPlacement.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-30, 0],
                }),
              },
              { rotate: '3.6deg' },
              {
                scale: nearPlacement.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1.04, 1],
                }),
              },
            ],
          },
        ]}
      />

      <Animated.View
        style={[
          styles.foregroundCard,
          {
            opacity: frontPlacement,
            transform: [
              {
                translateY: frontPlacement.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-30, 0],
                }),
              },
              {
                scale: frontPlacement.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1.035, 1],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.frontContent}>
          <View style={styles.metricGrid}>
            <Metric
              icon="calendar-check-outline"
              iconColor="#60a5fa"
              label="Due today"
              suffix={dueToday === 1 ? 'card' : 'cards'}
              value={String(dueToday)}
            />
            <Metric
              icon="fire"
              iconColor={iteraColors.accent}
              label="Current streak"
              suffix={streak === 1 ? 'day' : 'days'}
              value={String(streak)}
            />
            <Metric
              icon="bullseye-arrow"
              iconColor="#34d399"
              label="Retention"
              value={retention === null ? '—' : `${retention}%`}
            />
            <Metric
              icon="clock-outline"
              iconColor="#a78bfa"
              label="Estimated session"
              suffix="min"
              value={String(estimatedMinutes)}
            />
          </View>

          <View style={styles.divider} />

          <Pressable
            accessibilityHint={
              caughtUp
                ? 'Opens your decks'
                : 'Starts a review session over the cards due today'
            }
            accessibilityRole="button"
            onPress={caughtUp ? onBrowseLibrary : onStartSession}
            style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
          >
            <Text style={styles.ctaText}>
              {caughtUp ? 'Browse your library' : 'Start your next session'}
            </Text>
            <MaterialCommunityIcons color={iteraColors.accent} name="arrow-right" size={22} />
          </Pressable>
        </View>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  stack: {
    position: 'relative',
    marginTop: 28,
    marginRight: 20,
    marginBottom: 12,
    marginLeft: -2,
    paddingTop: 26,
    paddingHorizontal: 2,
  },
  rearCard: {
    position: 'absolute',
    top: 26,
    right: 3,
    bottom: 0,
    left: 3,
    borderRadius: 22,
    borderColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    pointerEvents: 'none',
  },
  rearCardBack: {
    top: 2,
    right: 15,
    bottom: -4,
    left: 20,
    backgroundColor: '#10437c',
  },
  rearCardNear: {
    top: 18,
    right: -8,
    bottom: -11,
    left: 5,
    backgroundColor: '#2b527d',
  },
  foregroundCard: {
    overflow: 'hidden',
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 22,
    borderWidth: 1,
    backgroundColor: iteraColors.navy,
    paddingHorizontal: 18,
    paddingTop: 24,
    paddingBottom: 8,
    ...Platform.select({
      ios: {
        shadowColor: iteraColors.navy,
        shadowOffset: { width: 0, height: 13 },
        shadowOpacity: 0.18,
        shadowRadius: 19,
      },
      android: { elevation: 9 },
      web: { boxShadow: '0 13px 19px rgba(30,41,59,0.18)' },
    }),
  },
  frontContent: {
    width: '92%',
    alignSelf: 'center',
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 24,
  },
  metric: {
    width: '50%',
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 7,
  },
  metricIcon: {
    width: 36,
    height: 36,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricCopy: {
    minWidth: 0,
    flex: 1,
    marginLeft: 7,
  },
  metricLabel: {
    color: 'rgba(248,250,252,0.72)',
    fontSize: 11,
    fontWeight: '500',
  },
  metricValue: {
    marginTop: 3,
    color: '#f8fafc',
    fontSize: 25,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  metricSuffix: {
    color: 'rgba(248,250,252,0.82)',
    fontSize: 13,
    fontWeight: '500',
  },
  divider: {
    width: '76%',
    height: StyleSheet.hairlineWidth,
    alignSelf: 'center',
    marginTop: 22,
    marginBottom: 4,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  cta: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    paddingHorizontal: 12,
  },
  ctaPressed: {
    opacity: 0.62,
    transform: [{ scale: 0.99 }],
  },
  ctaText: {
    color: iteraColors.accent,
    fontSize: 15,
    fontWeight: '700',
  },
})
