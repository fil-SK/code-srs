import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { onboardingTour } from './tourStore'

export function OnboardingPage() {
  const navigate = useNavigate()
  useEffect(() => {
    onboardingTour.start()
    navigate('/', { replace: true })
  }, [navigate])
  return null
}
