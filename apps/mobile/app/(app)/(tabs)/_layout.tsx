import { Tabs } from 'expo-router'

import { FlipTapTabBar } from '@/src/components/navigation/FlipTapTabBar'

export default function TabLayout() {
  return (
    <Tabs
      initialRouteName="today"
      tabBar={(props) => <FlipTapTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="library" options={{ title: 'Library' }} />
      <Tabs.Screen name="review" options={{ title: 'Review' }} />
      <Tabs.Screen name="today" options={{ title: 'Today' }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  )
}
