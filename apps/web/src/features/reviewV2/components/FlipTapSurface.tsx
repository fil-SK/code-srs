import { createContext, useContext, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { CanvasWaves } from './CanvasWaves'

const CanvasContext = createContext(false)

// Shared root for any tree rendered in the FlipTap visual system. The scoped
// tokens and CodeMirror both follow the app's active theme.
// Used by both /design-preview/* (via PreviewShell, which adds its own banner)
// and the production Review route once it renders v2 interactions - one
// mechanism, not a separate "real" vs "preview" copy of it.
export function FlipTapSurface({
  children,
  className,
  canvasTone = 'default',
}: {
  children: ReactNode
  className?: string
  canvasTone?: 'default' | 'quiet'
}) {
  // Review and editor previews can nest surfaces. Only the outer page paints
  // the canvas, otherwise each preview would restart and compound the waves.
  const nested = useContext(CanvasContext)

  return (
    <CanvasContext.Provider value={true}>
      <div
        className={cn(
          'fliptap-scope',
          nested ? 'fliptap-surface-nested' : 'fliptap-canvas',
          !nested && canvasTone === 'quiet' && 'fliptap-canvas-quiet',
          className,
        )}
      >
        {!nested && <CanvasWaves />}
        {children}
      </div>
    </CanvasContext.Provider>
  )
}
