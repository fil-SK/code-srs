import type { AchievementId } from '../domain/stats/achievements'
import type { IconDrawing } from './approvedIcons'

// Original milestone artwork: rounded line work and one restrained tint.
// Plain drawing data keeps a future native presentation on the same artwork.
export const achievementIconDrawings: Record<AchievementId, IconDrawing> = {
  'first-session': {
    viewBox: '0 0 32 32',
    attrs: { stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' },
    nodes: [
      { tag: 'rect', attrs: { x: 6, y: 4, width: 20, height: 24, rx: 4, fill: 'currentColor', fillOpacity: 0.09 } },
      { tag: 'path', attrs: { d: 'M11 10h10M11 14h5M11 21l3 3 7-7' } },
    ],
  },
  'five-days': {
    viewBox: '0 0 32 32',
    attrs: { stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' },
    nodes: [
      { tag: 'rect', attrs: { x: 4, y: 7, width: 24, height: 21, rx: 4, fill: 'currentColor', fillOpacity: 0.09 } },
      { tag: 'path', attrs: { d: 'M10 4v6M22 4v6M4 13h24' } },
      ...[[10, 18], [16, 18], [22, 18], [10, 23], [16, 23]].map(([cx, cy]) => ({
        tag: 'circle' as const, attrs: { cx, cy, r: 1.25, fill: 'currentColor', strokeWidth: 0 },
      })),
      { tag: 'circle', attrs: { cx: 22, cy: 23, r: 1.25, strokeWidth: 1.1 } },
    ],
  },
  'four-weeks': {
    viewBox: '0 0 32 32',
    attrs: { stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' },
    nodes: [
      { tag: 'path', attrs: { d: 'M12 8h8M24 12v8M20 24h-8M8 20v-8' } },
      ...[[3, 3], [19, 3], [19, 19], [3, 19]].map(([x, y]) => ({
        tag: 'rect' as const, attrs: { x, y, width: 10, height: 10, rx: 3, fill: 'currentColor', fillOpacity: 0.09 },
      })),
      { tag: 'path', attrs: { d: 'M6.5 8h3M22.5 8h3M22.5 24h3M6.5 24h3' } },
    ],
  },
  comeback: {
    viewBox: '0 0 32 32',
    attrs: { stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' },
    nodes: [
      { tag: 'circle', attrs: { cx: 16, cy: 17, r: 8, fill: 'currentColor', fillOpacity: 0.09, strokeWidth: 0 } },
      { tag: 'path', attrs: { d: 'M6 11a12 12 0 1 1-1 10M6 4v7h7M11 17l3 3 7-7' } },
    ],
  },
}