import { createElement, type ReactNode } from 'react'
import { achievementIconDrawings, type AchievementId, type IconDrawingNode } from '@fliptap/core'

function drawNode(node: IconDrawingNode, key: number): ReactNode {
  return createElement(node.tag, { ...node.attrs, key }, node.children?.map(drawNode))
}

export function AchievementIcon({ id, size = 24 }: { id: AchievementId; size?: number }) {
  const drawing = achievementIconDrawings[id]
  return (
    <svg width={size} height={size} viewBox={drawing.viewBox} fill="none"
      {...drawing.attrs} aria-hidden="true" focusable="false" data-achievement-icon={id}>
      {drawing.nodes.map(drawNode)}
    </svg>
  )
}