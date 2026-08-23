import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { iteraColors } from '@itera/core'
import { Image, StyleSheet, Text, View } from 'react-native'

const iteraSymbol = require('../../../assets/itera-logo.png')

export function MobileHeader() {
  return (
    <View style={styles.header}>
      <View style={styles.brand}>
        <Image resizeMode="contain" source={iteraSymbol} style={styles.symbol} />
        <Text style={styles.wordmark}>Itera</Text>
      </View>

      <View
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        style={styles.bellWrap}
      >
        <MaterialCommunityIcons color={iteraColors.inkBrand} name="bell-outline" size={28} />
        <View style={styles.notificationDot} />
      </View>
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
    pointerEvents: 'none',
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
