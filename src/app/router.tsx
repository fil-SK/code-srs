import { createBrowserRouter } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { RouteError } from './RouteError'
import { TodayPage } from '@/features/today/TodayPage'
import { DecksPage } from '@/features/decks/DecksPage'
import { DeckDetailPage } from '@/features/decks/DeckDetailPage'
import { RoadmapsPage } from '@/features/roadmaps/RoadmapsPage'
import { RoadmapEditorPage } from '@/features/roadmaps/RoadmapEditorPage'
import { ReviewPage } from '@/features/review/ReviewPage'
import { PreviewPage } from '@/features/preview/PreviewPage'
import { BrowsePage } from '@/features/cards/BrowsePage'
import { CardEditorPage } from '@/features/cards/CardEditorPage'
import { DraftsPage } from '@/features/drafts/DraftsPage'
import { StatsPage } from '@/features/stats/StatsPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { DesignPreviewIndex } from '@/features/design-preview/DesignPreviewIndex'
import { RecallPreviewPage } from '@/features/design-preview/review-recall/RecallPreviewPage'
import { MultipleChoicePreviewPage } from '@/features/design-preview/review-multiple-choice/MultipleChoicePreviewPage'
import { WriteCodePreviewPage } from '@/features/design-preview/review-write-code/WriteCodePreviewPage'
import { OrderingPreviewPage } from '@/features/design-preview/review-ordering/OrderingPreviewPage'
import { MatchingPreviewPage } from '@/features/design-preview/review-matching/MatchingPreviewPage'
import { WalkthroughPreviewPage } from '@/features/design-preview/review-walkthrough/WalkthroughPreviewPage'
import { LibraryBrowserPreviewPage } from '@/features/design-preview/library-browser/LibraryBrowserPreviewPage'
import { LibraryDeckPreviewPage } from '@/features/design-preview/library-deck/LibraryDeckPreviewPage'

export const router = createBrowserRouter([
  // Today owns '/' as its own structurally separate top-level route (its own
  // top-nav shell, not AppShell's sidebar — see docs/itera-decisions.md) —
  // same "chrome-free/different-chrome by construction" pattern as
  // design-preview below, not a page nested under AppShell.
  {
    path: '/',
    element: <TodayPage />,
    errorElement: <RouteError />,
  },
  // AppShell is a pathless layout route (no `path`): its children's routes
  // resolve exactly as before ('/decks', '/review', ...) with no URL change,
  // while '/' itself now belongs to Today above, not this shell.
  {
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      { path: 'decks', element: <DecksPage /> },
      { path: 'decks/:id', element: <DeckDetailPage /> },
      { path: 'roadmaps', element: <RoadmapsPage /> },
      { path: 'roadmaps/:id', element: <RoadmapEditorPage /> },
      { path: 'review', element: <ReviewPage /> },
      { path: 'preview', element: <PreviewPage /> },
      { path: 'browse', element: <BrowsePage /> },
      { path: 'cards/new', element: <CardEditorPage /> },
      { path: 'cards/:id/edit', element: <CardEditorPage /> },
      { path: 'drafts', element: <DraftsPage /> },
      { path: 'stats', element: <StatsPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
  // Design-preview routes are a structurally separate top-level entry, not
  // children of AppShell — chrome-free by construction, not by hiding
  // AppShell's chrome with CSS. See docs/itera-redesign-plan.md Phase B.
  {
    path: 'design-preview',
    errorElement: <RouteError />,
    children: [
      { index: true, element: <DesignPreviewIndex /> },
      { path: 'review/recall', element: <RecallPreviewPage /> },
      { path: 'review/multiple-choice', element: <MultipleChoicePreviewPage /> },
      { path: 'review/write-code', element: <WriteCodePreviewPage /> },
      { path: 'review/ordering', element: <OrderingPreviewPage /> },
      { path: 'review/matching', element: <MatchingPreviewPage /> },
      { path: 'review/walkthrough', element: <WalkthroughPreviewPage /> },
      { path: 'library', element: <LibraryBrowserPreviewPage /> },
      { path: 'library-empty', element: <LibraryBrowserPreviewPage collections={[]} decks={[]} /> },
      { path: 'library/:deckId', element: <LibraryDeckPreviewPage /> },
    ],
  },
])
