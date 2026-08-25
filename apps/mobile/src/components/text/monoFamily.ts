import { Platform } from 'react-native'

// The one monospace stack used by every code surface on this platform.
//
// Its own module rather than an export beside a component: a file that exports
// both a component and a constant breaks Fast Refresh, and the code block, the
// rich-text renderer, the Write Code editor and the Walkthrough all need this.
export const monoFamily = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
})
