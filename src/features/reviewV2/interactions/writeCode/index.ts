import { writeCodeBehavior } from '@itera/core'
import type { WebInteractionDefinition } from '../types'
import { WriteCodeView } from './WriteCodeView'

export const writeCodeDefinition: WebInteractionDefinition<'write_code'> = {
  ...writeCodeBehavior,
  View: WriteCodeView,
}
