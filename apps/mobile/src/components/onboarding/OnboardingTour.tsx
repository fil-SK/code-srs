import { fliptapColors, fliptapRadii, tourSteps } from '@fliptap/core'
import { usePathname } from 'expo-router'
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { AccessibilityInfo, BackHandler, Keyboard, Platform, Pressable, StyleSheet, Text, View, findNodeHandle, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { FlipTapButton } from '@/src/components/ui/FlipTapButton'
import { dismissOnboardingPrompt } from './onboardingPromptState'
import { onboardingTour, useTourState } from './tourStore'
import { refreshTourTargets, targetRegistry } from './tourTargets'

interface Rect { x: number; y: number; width: number; height: number }

export function OnboardingHost({ children }: { children: ReactNode }) {
  const state = useTourState()
  const pathname = usePathname()
  useEffect(() => {
    if (!state) return
    if (pathname === '/library') onboardingTour.event({ type: 'library-opened' })
    if (state.deckId && pathname === `/deck/${state.deckId}`) onboardingTour.event({ type: 'deck-opened', deckId: state.deckId })
    if (['/today', '/library', '/review', '/progress', '/profile'].includes(pathname)) onboardingTour.event({ type: 'navigation-ready' })
    if (pathname === '/progress') onboardingTour.event({ type: 'progress-opened' })
  }, [state, pathname])
  return <View style={{ flex: 1 }}>{children}<OnboardingTour /></View>
}

export function OnboardingTour({ inModal = false }: { inModal?: boolean }) {
  const state = useTourState()
  return state ? <TourCoach inModal={inModal} /> : null
}

function TourCoach({ inModal }: { inModal: boolean }) {
  const state = useTourState()
  const revision = useSyncExternalStore(targetRegistry.subscribe, targetRegistry.getSnapshot, () => 0)
  const dimensions = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const [rect, setRect] = useState<Rect | null>(null)
  const [keyboardTop, setKeyboardTop] = useState<number | null>(null)
  const visibleHeight = Math.min(dimensions.height, keyboardTop ?? dimensions.height)
  const [panelHeight, setPanelHeight] = useState(240)
  const activeStep = state?.step
  const step = tourSteps.find(item => item.id === state?.step)
  const target = state ? targetRegistry.get(state.step) : undefined
  const focused = useRef<string | null>(null)

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', event => { setKeyboardTop(event.endCoordinates.screenY); target?.reveal(); refreshTourTargets() })
    const hide = Keyboard.addListener('keyboardDidHide', () => { setKeyboardTop(null); refreshTourTargets() })
    return () => { show.remove(); hide.remove() }
  }, [target])

  useEffect(() => {
    if (!activeStep) return
    if (target && focused.current !== activeStep) {
      focused.current = activeStep
      target?.reveal()
      if (Platform.OS !== 'web' && target?.ref.current) {
        const handle = findNodeHandle(target.ref.current)
        if (handle) AccessibilityInfo.setAccessibilityFocus(handle)
      }
    }
    let frame = 0
    const started = Date.now()
    function measure() {
      target?.ref.current?.measureInWindow((x, y, width, height) => {
        const left = Math.max(6, x - 5)
        const top = Math.min(visibleHeight - 6, Math.max(insets.top + 4, y - 5))
        const right = Math.min(dimensions.width - 6, x + width + 5)
        const bottom = Math.min(visibleHeight - 6, y + height + 5)
        const next = { x: left, y: top, width: Math.max(0, right - left), height: Math.max(0, bottom - top) }
        setRect(previous => previous && Object.keys(next).every(key => previous[key as keyof Rect] === next[key as keyof Rect]) ? previous : next)
      })
      // Native sheets and stack transitions move after their first layout.
      if (Date.now() - started < 700) frame = requestAnimationFrame(measure)
    }
    frame = requestAnimationFrame(measure)
    if (!target) setRect(null)
    return () => { cancelAnimationFrame(frame) }
  }, [activeStep, target, revision, dimensions.width, dimensions.height, insets.top, visibleHeight])

  useEffect(() => {
    if (!state) return
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      dismissOnboardingPrompt(); onboardingTour.stop(); return true
    })
    return () => back.remove()
  }, [state])

  if (!state || !step || (target ? target.inModal !== inModal : inModal)) return null
  const complete = state.step === 'complete'
  const hole = complete ? null : rect
  const height = visibleHeight
  const width = Math.min(352, dimensions.width - 32)
  const left = hole ? Math.max(16, Math.min(hole.x + hole.width / 2 - width / 2, dimensions.width - width - 16)) : (dimensions.width - width) / 2
  const below = hole ? hole.y + hole.height + 12 : 0
  const above = hole ? hole.y - panelHeight - 12 : 0
  const top = complete ? Math.max(insets.top + 12, (height - panelHeight) / 2)
    : hole && below + panelHeight < height - insets.bottom - 12 ? below
      : hole && above > insets.top + 12 ? above : Math.max(insets.top + 12, height - panelHeight - insets.bottom - 12)
  function exit() { Keyboard.dismiss(); dismissOnboardingPrompt(); onboardingTour.stop() }
  return <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, styles.layer]}>
    {hole ? <>
      <View style={[styles.shade, { left: 0, top: 0, width: dimensions.width, height: hole.y }]} />
      <View style={[styles.shade, { left: 0, top: hole.y + hole.height, width: dimensions.width, bottom: 0 }]} />
      <View style={[styles.shade, { left: 0, top: hole.y, width: hole.x, height: hole.height }]} />
      <View style={[styles.shade, { left: hole.x + hole.width, right: 0, top: hole.y, height: hole.height }]} />
      <View pointerEvents="none" style={[styles.ring, { left: hole.x, top: hole.y, width: hole.width, height: hole.height }]} />
    </> : <View style={[StyleSheet.absoluteFill, styles.shade]} />}
    <View accessibilityLiveRegion="polite" onLayout={event => setPanelHeight(event.nativeEvent.layout.height)} style={[styles.coach, { left, top, width, maxHeight: height - insets.top - insets.bottom - 24 }]}>
      <View style={styles.header}>
        <Text style={styles.count}>Quick tour · {tourSteps.findIndex(item => item.id === state.step) + 1} / {tourSteps.length}</Text>
        <Pressable accessibilityRole="button" onPress={exit} style={styles.skip}><Text style={styles.skipText}>Skip tour</Text></Pressable>
      </View>
      <Text accessibilityRole="header" style={styles.title}>{step.title}</Text>
      <Text style={styles.copy}>{step.text}</Text>
      {!hole && !complete && <Text style={styles.count}>Waiting for this control. You can skip anytime.</Text>}
      <View style={styles.actions}>
        {step.action === 'input' && <FlipTapButton style={styles.action} label="Use example" variant="secondary" onPress={() => target?.example()} />}
        {(step.action === 'next' || step.action === 'input') && <FlipTapButton style={styles.action} label={state.step === 'today' ? 'Let’s go' : 'Continue'} disabled={!hole || (step.action === 'input' && !state.ready)} onPress={() => { Keyboard.dismiss(); onboardingTour.next() }} />}
        {step.action === 'control' && hole && <Text style={styles.count}>Use the highlighted control</Text>}
        {complete && <FlipTapButton style={styles.action} label="Finish tour" onPress={exit} />}
      </View>
      {complete && <Text style={styles.count}>Demo changes last until a full restart or Reset Demo.</Text>}
    </View>
  </View>
}
const styles = StyleSheet.create({
  layer: { zIndex: 10000 },
  shade: { position: 'absolute', backgroundColor: 'rgba(6,13,24,0.68)' },
  ring: { position: 'absolute', borderWidth: 2, borderColor: fliptapColors.accent, borderRadius: 12 },
  coach: { position: 'absolute', borderWidth: 1, borderColor: fliptapColors.border, borderRadius: fliptapRadii.dialog, backgroundColor: fliptapColors.surface, padding: 16, gap: 10 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  count: { color: fliptapColors.muted, fontSize: 12, lineHeight: 18 },
  skip: { minHeight: 44, paddingHorizontal: 6, justifyContent: 'center' },
  skipText: { color: fliptapColors.inkBrand, fontSize: 12, fontWeight: '600' },
  title: { color: fliptapColors.inkBrand, fontSize: 18, fontWeight: '700' },
  copy: { color: fliptapColors.muted, fontSize: 14, lineHeight: 21 },
  actions: { flexDirection: 'row', gap: 8 },
  action: { flex: 1, paddingHorizontal: 10 },
})
