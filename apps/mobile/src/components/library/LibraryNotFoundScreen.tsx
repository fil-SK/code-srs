import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { iteraColors, iteraRadii } from '@itera/core'
import { useRouter } from 'expo-router'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

// What a Library route renders when its id names nothing.
//
// It exists because the alternative was worse than an error: both Library
// routes used to hand their route parameter to a fixture factory that ignored
// it, so every deck link showed Modern C++ and every collection link that was
// not Languages & C++ showed Interview Core. A deep link, a stale history entry
// or a typo therefore displayed the wrong entity with no sign anything was
// wrong. Saying so is the honest outcome.
//
// Built from the existing Library idiom - the same back row and the same empty
// state card - rather than a new visual language.
export function LibraryNotFoundScreen({
  title,
  detail,
}: {
  title: string
  detail: string
}) {
  const router = useRouter()

  function goBack() {
    if (router.canGoBack()) router.back()
    else router.replace('/library')
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScrollView
        alwaysBounceVertical={false}
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          accessibilityLabel="Back to Library"
          accessibilityRole="button"
          hitSlop={8}
          onPress={goBack}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <MaterialCommunityIcons color="#49658e" name="chevron-left" size={27} />
          <Text style={styles.backText}>Library</Text>
        </Pressable>

        <View style={styles.card}>
          <MaterialCommunityIcons
            color={iteraColors.mutedLight}
            name="help-circle-outline"
            size={30}
          />
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.detail}>{detail}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: iteraColors.canvas,
  },
  scrollContent: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingTop: 10,
    paddingHorizontal: 18,
    paddingBottom: 44,
  },
  backButton: {
    minHeight: 44,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginLeft: -8,
    paddingRight: 12,
  },
  backText: {
    color: '#445b7e',
    fontSize: 16,
    fontWeight: '500',
  },
  card: {
    alignItems: 'center',
    marginTop: 24,
    borderColor: iteraColors.border,
    borderRadius: iteraRadii.card,
    borderWidth: 1,
    backgroundColor: iteraColors.surface,
    padding: 24,
  },
  title: {
    marginTop: 9,
    color: iteraColors.inkBrand,
    fontSize: 17,
    fontWeight: '700',
  },
  detail: {
    marginTop: 5,
    color: iteraColors.muted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.65,
  },
})
