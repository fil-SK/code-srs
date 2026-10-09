import { useNavigationContainerRef, useRouter } from 'expo-router'
import { useEffect, useRef } from 'react'
import { mobileRuntimeMode } from '@/src/config/mobileRuntimeMode'
import { StatusScreen } from '@/src/components/system/StatusScreen'
import { onboardingTour } from './tourStore'

export function OnboardingScreen() {
  const router = useRouter()
  const navigation = useNavigationContainerRef()
  const launched = useRef(false)
  useEffect(() => {
    if (mobileRuntimeMode !== 'demo' || launched.current) return
    let frame = 0
    function launch() {
      // A cold deep link can mount its screen before the root navigation ref.
      if (!navigation.isReady()) { frame = requestAnimationFrame(launch); return }
      launched.current = true
      router.replace('/today')
      onboardingTour.start()
    }
    frame = requestAnimationFrame(launch)
    return () => cancelAnimationFrame(frame)
  }, [router, navigation])
  if (mobileRuntimeMode !== 'demo') return <StatusScreen title="Interactive tour" detail="The guided authoring tour is available in the Demo workspace." />
  return null
}
