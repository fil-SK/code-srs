import { isSafeImageSource, iteraColors, iteraRadii } from '@itera/core'
import { Image, StyleSheet } from 'react-native'

// The one image sink in the card model, gated by the one shared policy.
//
// WalkthroughInteraction.image is untrusted persisted content: it survives a
// backup round trip, and a backup file is user-supplied JSON that may have been
// written by somebody other than the learner opening it. An arbitrary remote
// URL here would turn opening a flashcard into a network callback to a host the
// learner never chose - the privacy defect the web audit found and closed.
//
// The rule is NOT re-implemented here. isSafeImageSource lives in
// packages/core/src/content/imageSource.ts and travels with the parser, so web
// and native accept exactly the same set: base64 data: URLs of PNG, JPEG, GIF,
// WebP or AVIF, and nothing else. A refused source renders nothing at all
// rather than a broken-image placeholder, because a placeholder would invite
// somebody to "fix" it by relaxing the check.
//
// React Native's Image would happily fetch an https: source, so this component
// is the only place in the review tree allowed to build an Image from card
// data. richTextSecurity.test.tsx locks both directions.

export function SafeCardImage({ source, label }: { source: string | undefined; label: string }) {
  if (!isSafeImageSource(source)) return null

  return (
    <Image
      accessibilityLabel={label}
      accessible
      resizeMode="contain"
      source={{ uri: source }}
      style={styles.image}
    />
  )
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: 190,
    borderRadius: iteraRadii.control,
    borderWidth: 1,
    borderColor: iteraColors.border,
    backgroundColor: iteraColors.surfaceSubtle,
  },
})
