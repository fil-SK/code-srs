// Types for the hand-written logoReveal.js engine. The engine is plain JS (SVG geometry and
// timing maths, no dependencies); these declarations are the whole public surface the app uses.

export interface LogoRevealAnimation {
  config: typeof CONFIG
  duration: number
  renderAt(t: number): void
  renderLoop(t: number): void
}

export interface LogoRevealPlayOptions {
  speed?: number
  respectReducedMotion?: boolean
  onFrame?: (t: number) => void
  onDone?: () => void
}

export type LogoRevealVariant = 'reveal' | 'launch' | 'loader'

export declare const CONFIG: {
  colors: { bg: string; navy: string; orange: string }
  [key: string]: unknown
}
export declare const GEOMETRY: Record<string, unknown>

export declare function create(svg: SVGSVGElement, config?: unknown, geometry?: unknown): LogoRevealAnimation
export declare function play(
  anim: LogoRevealAnimation,
  variant?: LogoRevealVariant,
  options?: LogoRevealPlayOptions,
): { stop(): void }
