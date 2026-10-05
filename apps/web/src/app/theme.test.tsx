// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemeProvider, useTheme } from './theme'
import { AppearanceSection } from '@/features/settings/sections/AppearanceSection'
import { FlipTapSurface } from '@/features/reviewV2/components/FlipTapSurface'

const KEY = 'code-srs-theme'
let dark = false
let notify: (() => void) | undefined

function Probe() {
  const { theme } = useTheme()
  return <output data-testid="resolved-theme">{theme}</output>
}

function mount() {
  return render(
    <ThemeProvider>
      <FlipTapSurface><FlipTapSurface><Probe /><AppearanceSection /></FlipTapSurface></FlipTapSurface>
    </ThemeProvider>,
  )
}

beforeEach(() => {
  localStorage.removeItem(KEY)
  dark = false
  notify = undefined
  vi.spyOn(window, 'matchMedia').mockImplementation(() => ({
    get matches() { return dark },
    addEventListener: (_type: string, listener: () => void) => { notify = listener },
    removeEventListener: () => { notify = undefined },
  }) as unknown as MediaQueryList)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  localStorage.removeItem(KEY)
  document.documentElement.removeAttribute('data-theme')
})

describe('web appearance preference', () => {
  it('keeps light as the default and ignores an invalid stored preference', () => {
    localStorage.setItem(KEY, 'invalid')
    dark = true
    mount()
    expect(screen.getByTestId('resolved-theme').textContent).toBe('light')
    expect((screen.getByRole('radio', { name: 'Light' }) as HTMLInputElement).checked).toBe(true)
  })

  it('restores dark through nested surfaces, and persists a new selection', () => {
    localStorage.setItem(KEY, 'dark')
    mount()
    expect(screen.getByTestId('resolved-theme').textContent).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    fireEvent.click(screen.getByRole('radio', { name: 'Light' }))
    expect(localStorage.getItem(KEY)).toBe('light')
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('follows live device changes only while System is selected', () => {
    localStorage.setItem(KEY, 'system')
    mount()
    act(() => { dark = true; notify?.() })
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem(KEY)).toBe('system')
    fireEvent.click(screen.getByRole('radio', { name: 'Dark' }))
    act(() => { dark = false; notify?.() })
    expect(document.documentElement.dataset.theme).toBe('dark')
    fireEvent.click(screen.getByRole('radio', { name: 'System' }))
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('syncs a changed preference from another browser tab', () => {
    mount()
    localStorage.setItem(KEY, 'dark')
    act(() => window.dispatchEvent(new StorageEvent('storage', { key: KEY, newValue: 'dark' })))
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('still switches when saving the preference is blocked', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    mount()
    fireEvent.click(screen.getByRole('radio', { name: 'Dark' }))
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('removes the device listener on unmount', () => {
    const view = mount()
    expect(notify).toBeDefined()
    view.unmount()
    expect(notify).toBeUndefined()
  })
})
