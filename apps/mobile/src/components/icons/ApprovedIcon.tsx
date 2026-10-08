import Svg, { Circle, G, Path, Rect, type SvgProps } from 'react-native-svg'
import { approvedIconDrawings, type ApprovedIconName, type IconDrawingNode } from '@fliptap/core'

function drawNode(node: IconDrawingNode, key: number): React.ReactNode {
  const children = node.children?.map(drawNode)
  switch (node.tag) {
    case 'g': return <G key={key} {...node.attrs}>{children}</G>
    case 'path': return <Path key={key} {...node.attrs} />
    case 'rect': return <Rect key={key} {...node.attrs} />
    case 'circle': return <Circle key={key} {...node.attrs} />
  }
}

export interface ApprovedIconProps extends SvgProps {
  name: ApprovedIconName
  size?: number
}

// Native SVG primitives consume the same approved paths and fills as web.
export function ApprovedIcon({ name, size = 24, color = 'currentColor', ...props }: ApprovedIconProps) {
  const drawing = approvedIconDrawings[name]
  return (
    <Svg
      width={size}
      height={size}
      fill="none"
      color={color}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      {...props}
      {...drawing.attrs}
      viewBox={drawing.viewBox}
    >
      {drawing.nodes.map(drawNode)}
    </Svg>
  )
}
