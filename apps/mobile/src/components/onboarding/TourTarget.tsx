import type { TourStepId } from '@fliptap/core'
import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode, type RefObject } from 'react'
import { ScrollView, View, type ScrollViewProps, type StyleProp, type ViewStyle } from 'react-native'
import { onboardingTour, useTourState } from './tourStore'

import { refreshTourTargets, targets, type NativeTourTarget } from './tourTargets'

const TourScrollContext = createContext<((ref: RefObject<View | null>) => void) | null>(null)

// Measuring the actual field keeps touch input on the existing product control.
export function TourTarget({ id, children, ready, onExample, style, inModal = false }: {
  id: TourStepId
  children: ReactNode
  style?: StyleProp<ViewStyle>
  ready?: boolean
  onExample?: () => void
  inModal?: boolean
}) {
  const state = useTourState()
  const ref = useRef<View>(null)
  const example = useRef(onExample)
  example.current = onExample
  const scroll = useContext(TourScrollContext)
  const active = state?.step === id
  useEffect(() => {
    if (!active) return
    const entry: NativeTourTarget = { ref, inModal, reveal: () => scroll?.(ref), example: () => example.current?.() }
    targets.set(id, entry)
    refreshTourTargets()
    return () => { if (targets.get(id) === entry) { targets.delete(id); refreshTourTargets() } }
  }, [active, id, inModal, scroll])
  useEffect(() => {
    if (active && ready !== undefined) onboardingTour.setReady(id, ready)
  }, [active, id, ready])
  return <View ref={ref} style={style} collapsable={false} onLayout={() => { if (active) refreshTourTargets() }}>{children}</View>
}

export function TourScrollView({ children, onScroll, ...props }: ScrollViewProps) {
  const ref = useRef<ScrollView>(null)
  const frame = useRef<View>(null)
  const offset = useRef(0)
  const reveal = useMemo(() => (target: RefObject<View | null>) => {
    target.current?.measureInWindow((_x, y) => {
      frame.current?.measureInWindow((_sx, scrollY) => {
        ref.current?.scrollTo({ y: Math.max(0, offset.current + y - scrollY - 70), animated: false })
      })
    })
  }, [])
  return <TourScrollContext.Provider value={reveal}><View ref={frame} style={{ flex: 1 }} collapsable={false}>
    <ScrollView {...props} ref={ref} scrollEventThrottle={16} onScroll={event => {
      offset.current = event.nativeEvent.contentOffset.y
      onScroll?.(event)
      refreshTourTargets()
    }}>{children}</ScrollView>
  </View></TourScrollContext.Provider>
}
