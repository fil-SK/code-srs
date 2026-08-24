import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { iteraColors } from '@itera/core'
import { useRouter } from 'expo-router'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'

const iteraSymbol = require('../../../assets/itera-logo.png')

export function MobileHeader() {
  const router = useRouter()

  return (
    <View style={styles.header}>
      <View style={styles.brand}>
        <Image resizeMode="contain" source={iteraSymbol} style={styles.symbol} />
        <Text style={styles.wordmark}>Itera</Text>
      </View>

      <Pressable
        accessibilityLabel="Open notifications"
        accessibilityRole="button"
        hitSlop={6}
        onPress={() => router.push('/notifications')}
        style={({ pressed }) => [styles.bellWrap, pressed && styles.pressed]}
      >
        <MaterialCommunityIcons color={iteraColors.inkBrand} name="bell-outline" size={28} />
        <View style={styles.notificationDot} />
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
