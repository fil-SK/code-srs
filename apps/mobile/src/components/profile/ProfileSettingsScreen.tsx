import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { iteraColors, iteraRadii, useAuth } from '@itera/core'
import { useRouter } from 'expo-router'
import type { ComponentProps } from 'react'
import { useState } from 'react'
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { MobileHeader } from '@/src/components/today/MobileHeader'

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name']
export type ProfileSectionId =
  | 'profile'
  | 'email'
  | 'appearance'
  | 'notifications'
  | 'privacy'
  | 'devices'
  | 'import-export'

interface ProfileSection {
  id: ProfileSectionId
  label: string
  icon: IconName
}

interface UnavailableSection {
  title: string
  description: string
  notice: string
  planned: string[]
}

const sections: ProfileSection[] = [
  { id: 'profile', label: 'Profile', icon: 'account-outline' },
  { id: 'email', label: 'Email & Password', icon: 'email-outline' },
  { id: 'appearance', label: 'Appearance', icon: 'palette-outline' },
  { id: 'notifications', label: 'Notifications', icon: 'bell-outline' },
  { id: 'privacy', label: 'Privacy', icon: 'lock-outline' },
  { id: 'devices', label: 'Connected Devices', icon: 'monitor' },
  { id: 'import-export', label: 'Import / Export', icon: 'swap-vertical' },
]

const unavailableSections: Record<Exclude<ProfileSectionId, 'import-export'>, UnavailableSection> = {
  profile: {
    title: 'Profile',
    description: 'Manage your personal information and how you appear in Itera.',
    notice:
      'Not available yet. Itera has no profile record: an account is identified by the email you sign in with.',
    planned: ['Full name and username', 'Profile photo', 'Learning bio'],
  },
  email: {
    title: 'Email & Password',
    description: 'Change the address you sign in with, and manage your password.',
    notice:
      'Not available yet. Sign-in uses a six-digit email code, so there is no password to change here.',
    planned: ['Change email address', 'Set or change a password', 'Active sessions'],
  },
  appearance: {
    title: 'Appearance',
    description: 'How Itera looks.',
    notice:
      'Not available yet. Itera is light-only for now because its palette has no dark variant.',
    planned: ['Light / dark / system theme', 'Interface density', 'Code font and size'],
  },
  notifications: {
    title: 'Notifications',
    description: 'When and how Itera reminds you to study.',
    notice:
      'Not available yet. Itera has no reminder scheduler or mobile push registration.',
    planned: ['Daily study reminder', 'Streak-at-risk alerts', 'Email digests'],
  },
  privacy: {
    title: 'Privacy',
    description: 'What Itera stores and who can see it.',
    notice:
      'Not available yet. Itera has no analytics or telemetry to opt out of.',
    planned: ['Public profile visibility', 'Data collection controls', 'Download all data'],
  },
  devices: {
    title: 'Connected Devices',
    description: "Where you're signed in, and what has synced.",
    notice:
      'Not available yet. There is no device registry, though this device is signed in and reading your cloud workspace.',
    planned: ['Signed-in devices', 'Last sync per device', 'Revoke a device'],
  },
}

function SettingsRow({
  section,
  selected,
  onPress,
  last,
}: {
  section: ProfileSection
  selected: boolean
  onPress: () => void
  last: boolean
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.settingsRow,
        selected && styles.settingsRowSelected,
        !last && styles.settingsRowBorder,
        pressed && styles.pressed,
      ]}
    >
      <MaterialCommunityIcons
        color={selected ? iteraColors.accent : '#49658e'}
        name={section.icon}
        size={24}
      />
      <Text style={[styles.settingsRowLabel, selected && styles.settingsRowLabelSelected]}>
        {section.label}
      </Text>
      <MaterialCommunityIcons
        color={selected ? iteraColors.accent : iteraColors.muted}
        name="chevron-right"
        size={24}
      />
    </Pressable>
  )
}

function UnavailableDetail({ section }: { section: UnavailableSection }) {
  return (
    <View style={styles.detailCard}>
      <Text style={styles.detailTitle}>{section.title}</Text>
      <Text style={styles.detailDescription}>{section.description}</Text>

      <View style={styles.notice}>
        <MaterialCommunityIcons color={iteraColors.warning} name="sign-caution" size={19} />
        <Text style={styles.noticeText}>{section.notice}</Text>
      </View>

      <Text style={styles.plannedLabel}>PLANNED</Text>
      <View style={styles.plannedList}>
        {section.planned.map((item) => (
          <View key={item} style={styles.plannedRow}>
            <View style={styles.plannedDot} />
            <Text style={styles.plannedText}>{item}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

function BackupButton({ icon, label }: { icon: IconName; label: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: true }}
      disabled
      style={styles.backupButton}
    >
      <MaterialCommunityIcons color={iteraColors.inkBrand} name={icon} size={21} />
      <Text style={styles.backupButtonText}>{label}</Text>
    </Pressable>
  )
}

function ImportExportDetail() {
  const [mode, setMode] = useState<'merge' | 'replace'>('merge')

  return (
    <View style={styles.detailCard}>
      <Text style={styles.detailTitle}>Import / Export</Text>
      <Text style={styles.detailDescription}>
        Your backup, and the way to move data between devices.
      </Text>

      <View style={styles.notice}>
        <MaterialCommunityIcons color={iteraColors.warning} name="sign-caution" size={19} />
        <Text style={styles.noticeText}>
          Mobile backup actions will become available after native data access is connected.
        </Text>
      </View>

      <View style={styles.backupActions}>
        <BackupButton icon="download-outline" label="Export JSON" />
        <BackupButton icon="upload-outline" label="Import JSON" />
      </View>

      <View accessibilityRole="radiogroup" style={styles.modeRow}>
        {(['merge', 'replace'] as const).map((option) => {
          const selected = mode === option
          return (
            <Pressable
              key={option}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              onPress={() => setMode(option)}
              style={({ pressed }) => [styles.modeOption, pressed && styles.pressed]}
            >
              <View style={[styles.radio, selected && styles.radioSelected]}>
                {selected ? <View style={styles.radioDot} /> : null}
              </View>
              <Text style={styles.modeLabel}>
                {option === 'merge' ? 'Merge' : 'Replace'}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

function isProfileSectionId(value: string | undefined): value is ProfileSectionId {
  return sections.some((section) => section.id === value)
}

export function ProfileSettingsScreen({ initialSection }: { initialSection?: string }) {
  const router = useRouter()
  const { identity, signOut } = useAuth()
  const [selectedSection, setSelectedSection] = useState<ProfileSectionId>(
    isProfileSectionId(initialSection) ? initialSection : 'import-export',
  )
  const [signingOut, setSigningOut] = useState(false)

  // Signing out does not navigate. Clearing the Supabase session emits through
  // the shared auth engine, RootNavigator's guard closes, and this screen
  // unmounts with the rest of the authenticated group.
  async function handleSignOut() {
    if (signingOut) return
    setSigningOut(true)
    try {
      await signOut()
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <View style={styles.decorativeField}>
        <View style={styles.decorativeShapeLarge} />
        <View style={styles.decorativeShapeSmall} />
      </View>

      <ScrollView
        alwaysBounceVertical={false}
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
      >
        <MobileHeader />

        <View style={styles.intro}>
          <Text style={styles.title}>Profile & Settings</Text>
          <Text style={styles.subtitle}>
            Manage your account, preferences, devices, and backups.
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => setSelectedSection('profile')}
          style={({ pressed }) => [styles.workspaceCard, pressed && styles.pressed]}
        >
          <View style={styles.avatar}>
            <MaterialCommunityIcons color={iteraColors.surface} name="account-outline" size={34} />
          </View>
          <View style={styles.workspaceCopy}>
            {/* Real identity only, exactly as the web account menu does it:
                this product has no profile record and no display name, so the
                session's email is the whole truth, over a line saying where the
                data lives. Nothing here is fabricated. */}
            <Text numberOfLines={1} style={styles.workspaceTitle}>
              {identity?.email ?? 'Signed in'}
            </Text>
            <Text style={styles.workspaceSubtitle}>Synced with Supabase</Text>
            <Text style={styles.workspaceMeta}>Product screens still use preview data</Text>
          </View>
          <MaterialCommunityIcons color={iteraColors.muted} name="chevron-right" size={25} />
        </Pressable>

        <View style={styles.settingsCard}>
          {sections.map((section, index) => (
            <SettingsRow
              key={section.id}
              last={index === sections.length - 1}
              onPress={() => setSelectedSection(section.id)}
              section={section}
              selected={selectedSection === section.id}
            />
          ))}
        </View>

        {selectedSection === 'import-export' ? (
          <ImportExportDetail />
        ) : (
          <UnavailableDetail section={unavailableSections[selectedSection]} />
        )}

        {__DEV__ ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/diagnostics')}
            style={({ pressed }) => [styles.devRow, pressed && styles.pressed]}
          >
            <MaterialCommunityIcons color={iteraColors.muted} name="bug-outline" size={21} />
            <Text style={styles.devRowLabel}>Repository diagnostics (dev)</Text>
            <MaterialCommunityIcons color={iteraColors.muted} name="chevron-right" size={22} />
          </Pressable>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ busy: signingOut }}
          disabled={signingOut}
          onPress={() => void handleSignOut()}
          style={({ pressed }) => [styles.signOutButton, pressed && styles.pressed]}
        >
          <MaterialCommunityIcons color={iteraColors.error} name="logout" size={21} />
          <Text style={styles.signOutLabel}>{signingOut ? 'Signing out…' : 'Sign out'}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

const cardShadow = Platform.select({
  ios: {
    shadowColor: iteraColors.navy,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.06,
    shadowRadius: 13,
  },
  android: { elevation: 3 },
  web: { boxShadow: '0 5px 13px rgba(30,41,59,0.06)' },
})

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: iteraColors.canvas,
  },
  scroll: {
    zIndex: 1,
    flex: 1,
  },
  scrollContent: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingTop: 8,
    paddingHorizontal: 18,
    paddingBottom: 44,
  },
  decorativeField: {
    position: 'absolute',
    zIndex: 0,
    top: 76,
    right: 0,
    left: 0,
    height: 280,
    overflow: 'hidden',
    pointerEvents: 'none',
  },
  decorativeShapeLarge: {
    position: 'absolute',
    top: 18,
    right: -98,
    width: 280,
    height: 170,
    borderRadius: 90,
    backgroundColor: iteraColors.accentSofter,
    transform: [{ rotate: '-14deg' }],
  },
  decorativeShapeSmall: {
    position: 'absolute',
    top: 72,
    right: -74,
    width: 230,
    height: 115,
    borderRadius: 70,
    backgroundColor: iteraColors.accentSoft,
    opacity: 0.7,
    transform: [{ rotate: '-8deg' }],
  },
  intro: {
    marginTop: 20,
  },
  title: {
    color: iteraColors.inkBrand,
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.8,
    lineHeight: 36,
  },
  subtitle: {
    maxWidth: 390,
    marginTop: 6,
    color: iteraColors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  workspaceCard: {
    minHeight: 112,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 22,
    borderColor: iteraColors.border,
    borderRadius: iteraRadii.dialog,
    borderWidth: 1,
    backgroundColor: iteraColors.surface,
    padding: 16,
    ...cardShadow,
  },
  avatar: {
    width: 64,
    height: 64,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 32,
    backgroundColor: iteraColors.navy,
  },
  workspaceCopy: {
    minWidth: 0,
    flex: 1,
    marginHorizontal: 15,
  },
  workspaceTitle: {
    color: iteraColors.inkBrand,
    fontSize: 18,
    fontWeight: '700',
  },
  workspaceSubtitle: {
    marginTop: 4,
    color: '#445b7e',
    fontSize: 14,
  },
  workspaceMeta: {
    marginTop: 4,
    color: iteraColors.muted,
    fontSize: 12,
  },
  settingsCard: {
    marginTop: 18,
    overflow: 'hidden',
    borderColor: iteraColors.border,
    borderRadius: iteraRadii.dialog,
    borderWidth: 1,
    backgroundColor: iteraColors.surface,
    paddingHorizontal: 14,
    ...cardShadow,
  },
  settingsRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 5,
  },
  settingsRowBorder: {
    borderBottomColor: iteraColors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingsRowSelected: {
    marginHorizontal: -14,
    borderBottomColor: 'transparent',
    backgroundColor: iteraColors.accentSoft,
    paddingHorizontal: 19,
  },
  settingsRowLabel: {
    minWidth: 0,
    flex: 1,
    color: iteraColors.inkBrand,
    fontSize: 16,
    fontWeight: '500',
  },
  settingsRowLabelSelected: {
    color: iteraColors.accent,
    fontWeight: '700',
  },
  detailCard: {
    marginTop: 18,
    borderColor: iteraColors.border,
    borderRadius: iteraRadii.dialog,
    borderWidth: 1,
    backgroundColor: iteraColors.surface,
    padding: 17,
    ...cardShadow,
  },
  detailTitle: {
    color: iteraColors.inkBrand,
    fontSize: 20,
    fontWeight: '700',
  },
  detailDescription: {
    marginTop: 5,
    color: iteraColors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    marginTop: 15,
    borderColor: iteraColors.border,
    borderRadius: iteraRadii.control,
    borderWidth: 1,
    backgroundColor: iteraColors.surfaceSubtle,
    padding: 12,
  },
  noticeText: {
    minWidth: 0,
    flex: 1,
    color: iteraColors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  plannedLabel: {
    marginTop: 17,
    color: iteraColors.muted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  plannedList: {
    gap: 8,
    marginTop: 10,
  },
  plannedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  plannedDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: iteraColors.borderStrong,
  },
  plannedText: {
    color: iteraColors.mutedLight,
    fontSize: 13,
  },
  backupActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 15,
  },
  backupButton: {
    minHeight: 48,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderColor: iteraColors.borderStrong,
    borderRadius: iteraRadii.control,
    borderWidth: 1,
    opacity: 0.62,
    paddingHorizontal: 10,
  },
  backupButtonText: {
    color: iteraColors.inkBrand,
    fontSize: 14,
    fontWeight: '600',
  },
  modeRow: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 17,
  },
  modeOption: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  radio: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: iteraColors.muted,
    borderRadius: 11,
    borderWidth: 1.5,
  },
  radioSelected: {
    borderColor: '#1687ff',
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#1687ff',
  },
  modeLabel: {
    color: iteraColors.muted,
    fontSize: 14,
  },
  devRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 14,
    borderColor: iteraColors.border,
    borderRadius: iteraRadii.card,
    borderWidth: 1,
    borderStyle: 'dashed',
    paddingHorizontal: 14,
  },
  devRowLabel: { flex: 1, color: iteraColors.muted, fontSize: 15, fontWeight: '600' },
  signOutButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    marginTop: 14,
    borderColor: iteraColors.border,
    borderRadius: iteraRadii.card,
    borderWidth: 1,
    backgroundColor: iteraColors.surface,
  },
  signOutLabel: { color: iteraColors.error, fontSize: 15, fontWeight: '700' },
  pressed: {
    opacity: 0.68,
  },
})
