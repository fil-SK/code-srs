import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { approvedIconDrawings, type ApprovedIconName } from '@fliptap/core'
import type { ComponentProps } from 'react'
import { ApprovedIcon } from './ApprovedIcon'

export type AppIconName = ApprovedIconName | ComponentProps<typeof MaterialCommunityIcons>['name']

// Reviewed identities use shared SVGs; utility icons retain the existing set.
export function AppIcon({ name, size = 24, color = '#1e293b' }: { name: AppIconName; size?: number; color?: string }) {
  if (Object.prototype.hasOwnProperty.call(approvedIconDrawings, name)) {
    return <ApprovedIcon name={name as ApprovedIconName} size={size} color={color} />
  }
  return <MaterialCommunityIcons name={name as ComponentProps<typeof MaterialCommunityIcons>['name']} size={size} color={color} />
}
