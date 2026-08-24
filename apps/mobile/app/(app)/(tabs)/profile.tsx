import { useLocalSearchParams } from 'expo-router'

import { ProfileSettingsScreen } from '@/src/components/profile/ProfileSettingsScreen'

export default function ProfileRoute() {
  const { section } = useLocalSearchParams<{ section?: string }>()

  return <ProfileSettingsScreen initialSection={section} />
}
