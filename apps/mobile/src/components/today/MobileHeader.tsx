import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { iteraColors } from '@itera/core'
import { useRouter } from 'expo-router'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'

import { demoUnreadCount } from '@/src/demo/demoSelectors'
import { useDemoWorkspaceOptional } from '@/src/demo/demoWorkspaceContext'

const iteraSymbol = require('../../../assets/itera-logo.png')

export function MobileHeader() {
  const router = useRouter()
  // The dot used to be painted unconditionally, so it stayed lit after every
  // notification had been read. Notifications are demo-only - there is no push
  // registration and no notification backend - so a cloud build has no unread
  // count and correctly shows no dot.
  const demo = useDemoWorkspaceOptional()
  const unreadCount = demo ? demoUnreadCount(demo.notifications) : 0

  return (
    <View style={styles.header}>
      <View style={styles.brand}>
        <Image resizeMode="contain" source={iteraSymbol} style={styles.symbol} />
        <Text style={styles.wordmark}>Itera</Text>
      </View>

      <Pressable
        accessibilityLabel={
          unreadCount > 0
            ? 'Open notifications, ' + unreadCount + ' unread'
            : 'Open notifications'
        }
        accessibilityRole="button"
        hitSlop={6}
        onPress={() => router.push('/notifications')}
        style={({ pressed }) => [styles.bellWrap, pressed && styles.pressed]}
      >
        <MaterialCommunityIcons color={iteraColors.inkBrand} name="bell-outline" size={28} />
        {unreadCount > 0 ? <View style={styles.notificationDot} /> : null}
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  symbol: {
    width: 42,
    height: 42,
  },
  wordmark: {
    color: iteraColors.inkBrand,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.7,
  },
  bellWrap: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.62,
  },
  notificationDot: {
    position: 'absolute',
    top: 7,
    right: 6,
    width: 8,
    height: 8,
    borderColor: iteraColors.canvas,
    borderRadius: 4,
    borderWidth: 1,
    backgroundColor: iteraColors.accent,
  },
})
