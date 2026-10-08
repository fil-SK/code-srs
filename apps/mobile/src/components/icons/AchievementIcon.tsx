import Svg, { Circle, G, Path, Rect } from 'react-native-svg'
import { achievementIconDrawings, type AchievementId, type IconDrawingNode } from '@fliptap/core'

function drawNode(node: IconDrawingNode, key: number): React.ReactNode {
  const children = node.children?.map(drawNode)
  switch (node.tag) {
    case 'g': return <G key={key} {...node.attrs}>{children}</G>
    case 'path': return <Path key={key} {...node.attrs} />
    case 'rect': return <Rect key={key} {...node.attrs} />
    case 'circle': return <Circle key={key} {...node.attrs} />
  }
}

export function AchievementIcon({ id, size = 28, color }: { id: AchievementId; size?: number; color: string }) {
  const drawing = achievementIconDrawings[id]
  return (
    <Svg width={size} height={size} fill="none" color={color} {...drawing.attrs}
      viewBox={drawing.viewBox} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {drawing.nodes.map(drawNode)}
    </Svg>
  )
}