import { createBrowserRouter } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { RouteError } from './RouteError'
import { TodayPage } from '@/features/today/TodayPage'
import { LibraryBrowserPage } from '@/features/library/LibraryBrowserPage'
import { LibraryDeckPage } from '@/features/library/LibraryDeckPage'
import { RoadmapsPage } from '@/features/roadmaps/RoadmapsPage'
import { RoadmapEditorPage } from '@/features/roadmaps/RoadmapEditorPage'
import { ReviewPage } from '@/features/review/ReviewPage'
import { PreviewPage } from '@/features/preview/PreviewPage'
import { BrowsePage } from '@/features/cards/BrowsePage'
import { CardEditorPage } from '@/features/cards/CardEditorPage'
import { CardCreatePage } from '@/features/cardsV2/CardCreatePage'
import { CardEditEntry } from '@/features/cardsV2/CardEditEntry'
import { CardStudyPreviewPage } from '@/features/cardsV2/CardStudyPreviewPage'
import { DraftsPage } from '@/features/drafts/DraftsPage'
import { StatsPage } from '@/features/stats/StatsPage'
import { ProgressPage } from '@/features/progress/ProgressPage'
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
  // Today owns '/' as its own structurally separate top-level route
  // previously (now folded into the shared AppShell — see below); kept as
  // its own top-level entry only because Review, right below, needs the same
  // "chrome-free/different-chrome by construction" treatment design-preview
  // already used, and Today's route already proved the pattern works.
  {
    path: '/',
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <TodayPage /> },
      { path: 'decks', element: <LibraryBrowserPage /> },
      { path: 'decks/:id', element: <LibraryDeckPage /> },
      { path: 'decks/:deckId/cards/new', element: <CardCreatePage /> },
      { path: 'roadmaps', element: <RoadmapsPage /> },
      { path: 'roadmaps/:id', element: <RoadmapEditorPage /> },
      { path: 'preview', element: <PreviewPage /> },
      { path: 'browse', element: <BrowsePage /> },
      { path: 'cards/new', element: <CardEditorPage /> },
      { path: 'cards/:id/edit', element: <CardEditEntry /> },
      { path: 'cards/:id/study', element: <CardStudyPreviewPage /> },
      { path: 'drafts', element: <DraftsPage /> },
      { path: 'stats', element: <StatsPage /> },
      { path: 'progress', element: <ProgressPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
  // Review is immersive (locked IA): no global nav, no logo, no sidebar. A
  // structurally separate top-level route — the same "chrome-free by
  // construction, not by hiding AppShell's chrome with CSS" pattern
  // design-preview uses below — not a child of AppShell.
  {
    path: 'review',
    element: <ReviewPage />,
    errorElement: <RouteError />,
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
