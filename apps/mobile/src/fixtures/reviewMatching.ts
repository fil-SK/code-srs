import { matchingBehavior, richText } from '@itera/core'

import type { MobileMatchingPreviewViewModel } from '@/src/types/review'

const sourceItems = [
  { id: 'vector', content: richText('std::vector') },
  { id: 'list', content: richText('std::list') },
  { id: 'deque', content: richText('std::deque') },
]

const layoutItems = [
  { id: 'contiguous', content: richText('One contiguous buffer') },
  { id: 'linked', content: richText('Doubly-linked nodes') },
  { id: 'chunks', content: richText('Fixed-size chunks') },
]

const accessItems = [
  { id: 'access-yes', content: richText('Yes') },
  { id: 'access-no', content: richText('No') },
]

export const mobileMatchingPreviewFixture: MobileMatchingPreviewViewModel = {
  cardId: 'fixture-matching-container-layout',
  interactionType: matchingBehavior.type,
  current: 3,
  total: 10,
  prompt: 'Match each container to its memory layout and random-access guarantee.',
  interaction: {
    type: matchingBehavior.type,
    columns: [
      { id: 'container', label: 'Container', items: sourceItems },
      { id: 'layout', label: 'Memory layout', items: layoutItems },
      { id: 'access', label: 'O(1) random access?', items: accessItems, fixed: true },
    ],
    relationships: [
      { container: 'vector', layout: 'contiguous', access: 'access-yes' },
      { container: 'list', layout: 'linked', access: 'access-no' },
      { container: 'deque', layout: 'chunks', access: 'access-yes' },
    ],
  },
  presentedItemIds: {
    container: ['vector', 'list', 'deque'],
    layout: ['linked', 'chunks', 'contiguous'],
    access: ['access-yes', 'access-no'],
  },
  ratingIntervals: {
    1: '<1m',
    2: '6m',
    3: '10m',
    4: '8d',
  },
}
