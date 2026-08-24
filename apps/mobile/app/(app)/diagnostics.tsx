import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { iteraColors, iteraRadii, useAuth, useCreateDeck, useDecks, useDeleteDeck } from '@itera/core'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { StatusScreen } from '@/src/components/system/StatusScreen'
import { mobileRuntimeMode } from '@/src/config/mobileRuntimeMode'

// A development-only proof that the whole seam is live, and deliberately not a
// product screen.
//
// M1A has to demonstrate more than "auth says signed in": that an authenticated
// native client reaches the shared Repository, that RLS scopes what comes back,
// and that a write lands under the right owner. Doing that by wiring Today or
// Library to real data would mix real and fixture values on a surface the owner
// has already reviewed, which is exactly the dishonest half-state this milestone
// is supposed to avoid. So the proof lives here instead, off the tab bar,
// reachable only from a row that Profile renders only in development.
//
// Everything it does goes through the ordinary hooks - useDecks, useCreateDeck,
// useDeleteDeck - so what it proves is the real path, not a special one. It
// names no backend and builds no client.

const PROBE_PREFIX = 'M1A probe '

// The gate is a separate component from the probe so the repository hooks are
// never mounted at all outside cloud mode. Demo mode registers no backend on
// purpose, so calling them there would fire a query with nothing behind it.
export default function DiagnosticsRoute() {
  // Compiled out of a production bundle by the bundler's constant folding, and
  // refused at runtime regardless, so this cannot ship as a reachable screen.
  if (!__DEV__) {
    return <StatusScreen title="Not available" detail="Diagnostics are development-only." />
  }

  if (mobileRuntimeMode !== 'cloud') {
    return (
      <StatusScreen
        detail="This probe exercises the shared Repository against Supabase. Demo mode registers no backend, so there is nothing for it to reach. Set EXPO_PUBLIC_ITERA_MODE=cloud with valid Supabase configuration to use it."
        title="Diagnostics need cloud mode"
      />
    )
  }

  return <CloudDiagnostics />
}

function CloudDiagnostics() {
  const router = useRouter()
  const { identity, session } = useAuth()
  const decks = useDecks()
  const createDeck = useCreateDeck()
  const deleteDeck = useDeleteDeck()
  const [lastAction, setLastAction] = useState<string | null>(null)

  const probeDecks = (decks.data ?? []).filter((deck) => deck.name.startsWith(PROBE_PREFIX))

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable
          accessibilityLabel="Back"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/profile'))}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        >
          <MaterialCommunityIcons color={iteraColors.inkBrand} name="chevron-left" size={27} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <Text style={styles.title}>Repository diagnostics</Text>
        <Text style={styles.subtitle}>
          Development only. Reads and writes real account data through @itera/core.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Identity</Text>
          <Row label="Email" value={identity?.email ?? '—'} />
          <Row label="User id" value={session?.user.id ?? '—'} mono />
          <Text style={styles.hint}>
            Every row written below carries this id in user_id. Compare it in the Supabase table
            editor to confirm RLS ownership.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Read</Text>
          {decks.isPending ? (
            <View style={styles.busyRow}>
              <ActivityIndicator color={iteraColors.accent} />
              <Text style={styles.value}>Loading decks…</Text>
            </View>
          ) : decks.isError ? (
            <Text style={[styles.value, styles.errorText]}>
              The read failed. Check the schema, the grants and the network.
            </Text>
          ) : (
            <>
              <Row label="Decks returned" value={String(decks.data?.length ?? 0)} />
              {(decks.data ?? []).slice(0, 8).map((deck) => (
                <Text key={deck.id} numberOfLines={1} style={styles.listItem}>
                  · {deck.name}
                </Text>
              ))}
            </>
          )}
          <Pressable
            accessibilityRole="button"
            onPress={() => void decks.refetch()}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
          >
            <Text style={styles.secondaryButtonText}>Refetch</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Write</Text>
          <Text style={styles.hint}>
            Creates one disposable deck through useCreateDeck, then removes it through
            useDeleteDeck. Nothing else is touched.
          </Text>

          <Pressable
            accessibilityRole="button"
            disabled={createDeck.isPending}
            onPress={() => {
              setLastAction(null)
              createDeck.mutate(
                {
                  name: PROBE_PREFIX + new Date().toISOString().slice(11, 19),
                  description: 'Disposable M1A verification deck. Safe to delete.',
                },
                {
                  onSuccess: (deck) => setLastAction('Created ' + deck.id),
                  onError: () => setLastAction('Create failed.'),
                },
              )
            }}
            style={({ pressed }) => [
              styles.primaryButton,
              createDeck.isPending && styles.buttonDisabled,
              pressed && styles.pressed,
            ]}
          >
            {createDeck.isPending ? (
              <ActivityIndicator color={iteraColors.surface} />
            ) : (
              <Text style={styles.primaryButtonText}>Create probe deck</Text>
            )}
          </Pressable>

          {probeDecks.map((deck) => (
            <View key={deck.id} style={styles.probeRow}>
              <Text numberOfLines={1} style={styles.probeName}>
                {deck.name}
              </Text>
              <Pressable
                accessibilityLabel={'Delete ' + deck.name}
                accessibilityRole="button"
                disabled={deleteDeck.isPending}
                hitSlop={8}
                onPress={() => {
                  setLastAction(null)
                  deleteDeck.mutate(deck.id, {
                    onSuccess: () => setLastAction('Deleted ' + deck.id),
                    onError: () => setLastAction('Delete failed.'),
                  })
                }}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <MaterialCommunityIcons
                  color={iteraColors.error}
                  name="trash-can-outline"
                  size={22}
                />
              </Pressable>
            </View>
          ))}

          {lastAction ? <Text style={styles.hint}>{lastAction}</Text> : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text numberOfLines={1} style={[styles.value, mono && styles.mono]}>
        {value}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: iteraColors.canvas },
  content: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 48, gap: 14 },
  back: { minHeight: 44, flexDirection: 'row', alignItems: 'center' },
  backText: { color: iteraColors.inkBrand, fontSize: 16, fontWeight: '600' },
  title: { color: iteraColors.inkBrand, fontSize: 24, fontWeight: '700', letterSpacing: -0.5 },
  subtitle: { color: iteraColors.muted, fontSize: 14, lineHeight: 20 },
  card: {
    gap: 8,
    borderColor: iteraColors.border,
    borderRadius: iteraRadii.card,
    borderWidth: 1,
    backgroundColor: iteraColors.surface,
    padding: 14,
  },
  cardTitle: { color: iteraColors.inkBrand, fontSize: 16, fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  label: { color: iteraColors.muted, fontSize: 14 },
  value: { flexShrink: 1, color: iteraColors.ink, fontSize: 14, fontWeight: '600' },
  mono: { fontSize: 12, fontWeight: '400' },
  errorText: { color: iteraColors.error },
  listItem: { color: iteraColors.muted, fontSize: 13 },
  hint: { color: iteraColors.mutedLight, fontSize: 12, lineHeight: 18 },
  busyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  primaryButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    borderRadius: iteraRadii.control,
    backgroundColor: iteraColors.accent,
  },
  primaryButtonText: { color: iteraColors.surface, fontSize: 15, fontWeight: '700' },
  buttonDisabled: { opacity: 0.6 },
  secondaryButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    borderColor: iteraColors.border,
    borderRadius: iteraRadii.control,
    borderWidth: 1,
  },
  secondaryButtonText: { color: iteraColors.inkBrand, fontSize: 14, fontWeight: '600' },
  probeRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  probeName: { flex: 1, color: iteraColors.ink, fontSize: 14 },
  pressed: { opacity: 0.68 },
})
