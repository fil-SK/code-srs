import { orderingBehavior, richText } from '@itera/core'

import type { MobileOrderingPreviewViewModel } from '@/src/types/review'

const items = [
  { id: 'check-capacity', content: richText('Check whether size() == capacity()') },
  { id: 'allocate-buffer', content: richText('Allocate a new, larger buffer') },
  { id: 'move-elements', content: richText('Move-construct the existing elements into the new buffer') },
  { id: 'construct-new', content: richText('Construct the new element at the end of the new buffer') },
  { id: 'destroy-old', content: richText('Destroy the elements in the old buffer and deallocate it') },
]

export const mobileOrderingPreviewFixture: MobileOrderingPreviewViewModel = {
  cardId: 'fixture-ordering-vector-reallocation',
  interactionType: orderingBehavior.type,
  current: 2,
  total: 10,
  prompt: {
    lead: 'Put these steps in order for what happens when ',
    firstCode: 'push_back',
    middle: ' triggers a ',
    secondCode: 'std::vector',
    tail: ' reallocation.',
  },
  interaction: {
    type: orderingBehavior.type,
    randomize: true,
    items,
    correctOrder: items.map((item) => item.id),
  },
  initialOrder: [
    'allocate-buffer',
    'destroy-old',
    'check-capacity',
    'construct-new',
    'move-elements',
  ],
  ratingIntervals: {
    1: '<1m',
    2: '6m',
    3: '10m',
    4: '8d',
  },
}
