import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { iteraColors } from '@itera/core'
import { Tabs } from 'expo-router'
import type { ComponentProps } from 'react'
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

type IteraTabBarProps = Parameters<
  NonNullable<ComponentProps<typeof Tabs>['tabBar']>
>[0]
type IconName = ComponentProps<typeof MaterialCommunityIcons>['name']

const ICONS: Record<string, IconName> = {
  library: 'book-open-page-variant-outline',
  review: 'refresh',
  progress: 'chart-bar',
  profile: 'account-outline',
}

const iteraSymbol = require('../../../assets/itera-logo.png')

export function IteraTabBar({ state, descriptors, navigation }: IteraTabBarProps) {
  const insets = useSafeAreaInsets()

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {state.routes.map((route, index) => {
        const selected = state.index === index
        const options = descriptors[route.key].options
        const label =
          typeof options.tabBarLabel === 'string'
            ? options.tabBarLabel
            : typeof options.title === 'string'
              ? options.title
              : route.name
        const isToday = route.name === 'today'

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          })

          if (!selected && !event.defaultPrevented) {
            navigation.navigate(route.name)
          }
        }

        const onLongPress = () => {
          navigation.emit({ type: 'tabLongPress', target: route.key })
        }

        return (
          <Pressable
            key={route.key}
            accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            hitSlop={6}
            onLongPress={onLongPress}
            onPress={onPress}
            style={({ pressed }) => [
              styles.item,
              isToday && styles.todayItem,
              pressed && styles.pressed,
            ]}
          >
            {isToday ? (
              <View style={[styles.todayMark, selected && styles.todayMarkSelected]}>
                <Image resizeMode="contain" source={iteraSymbol} style={styles.todaySymbol} />
              </View>
            ) : (
              <MaterialCommunityIcons
                color={selected ? iteraColors.accent : iteraColors.muted}
                name={ICONS[route.name] ?? 'circle-outline'}
                size={25}
              />
            )}
            <Text
              numberOfLines={1}
              style={[
                styles.label,
                selected && styles.labelSelected,
                isToday && styles.todayLabel,
              ]}
            >
              {label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderTopColor: iteraColors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    backgroundColor: iteraColors.surface,
    paddingTop: 8,
    ...Platform.select({
      ios: {
        shadowColor: iteraColors.navy,
        shadowOffset: { width: 0, height: -5 },
        shadowOpacity: 0.06,
        shadowRadius: 14,
      },
      android: { elevation: 8 },
      web: { boxShadow: '0 -5px 14px rgba(30,41,59,0.06)' },
    }),
  },
  item: {
    minHeight: 54,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  todayItem: {
    marginTop: -28,
    justifyContent: 'flex-start',
  },
  todayMark: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: iteraColors.borderStrong,
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: iteraColors.surface,
    ...Platform.select({
      ios: {
        shadowColor: iteraColors.accent,
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
      android: { elevation: 5 },
      web: { boxShadow: '0 5px 10px rgba(255,105,2,0.1)' },
    }),
    transform: [{ rotate: '45deg' }],
  },
  todayMarkSelected: {
    borderColor: iteraColors.accent,
    borderWidth: 1.5,
    ...Platform.select({
      ios: { shadowOpacity: 0.17 },
      web: { boxShadow: '0 5px 12px rgba(255,105,2,0.17)' },
    }),
  },
  todaySymbol: {
    width: 36,
    height: 36,
    transform: [{ rotate: '-45deg' }],
  },
  label: {
    color: iteraColors.muted,
    fontSize: 11,
    fontWeight: '500',
  },
  labelSelected: {
    color: iteraColors.accent,
    fontWeight: '700',
  },
  todayLabel: {
    marginTop: 3,
  },
  pressed: {
    opacity: 0.68,
  },
})
