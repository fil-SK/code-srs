import { createBrowserRouter } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { RequireAuth } from '@/auth/RequireAuth'
import { LoginPage } from '@/features/login/LoginPage'
import { RouteError } from './RouteError'
import { TodayPage } from '@/features/today/TodayPage'
import { LibraryBrowserPage } from '@/features/library/LibraryBrowserPage'
import { LibraryDeckPage } from '@/features/library/LibraryDeckPage'
import { RoadmapsPage } from '@/features/roadmaps/RoadmapsPage'
import { RoadmapEditorPage } from '@/features/roadmaps/RoadmapEditorPage'
import { ReviewPage } from '@/features/review/ReviewPage'
import { PreviewPage } from '@/features/preview/PreviewPage'
import { CardCreatePage } from '@/features/cards/CardCreatePage'
import { CardEditEntry } from '@/features/cards/CardEditEntry'
import { CardStudyPreviewPage } from '@/features/cards/CardStudyPreviewPage'
import { AchievementsPage } from '@/features/progress/AchievementsPage'
import { ProgressPage } from '@/features/progress/ProgressPage'
import { ReviewHistoryPage } from '@/features/progress/ReviewHistoryPage'
import { AccountSettingsPage } from '@/features/settings/AccountSettingsPage'
import { AboutPage } from '@/features/about/AboutPage'
import { OnboardingPage } from '@/features/onboarding/OnboardingPage'
import { HelpPage } from '@/features/help/HelpPage'
import { DesignPreviewIndex } from '@/features/design-preview/DesignPreviewIndex'
import { RecallPreviewPage } from '@/features/design-preview/review-recall/RecallPreviewPage'
import { MultipleChoicePreviewPage } from '@/features/design-preview/review-multiple-choice/MultipleChoicePreviewPage'
import { WriteCodePreviewPage } from '@/features/design-preview/review-write-code/WriteCodePreviewPage'
import { OrderingPreviewPage } from '@/features/design-preview/review-ordering/OrderingPreviewPage'
import { MatchingPreviewPage } from '@/features/design-preview/review-matching/MatchingPreviewPage'
import { WalkthroughPreviewPage } from '@/features/design-preview/review-walkthrough/WalkthroughPreviewPage'
// Dev-only: the scenario switcher is absent from production builds. The import
// is dynamic and sits inside the import.meta.env.DEV branch, which is statically
// false in production, so the whole module (and its database) is dropped.
const devRoutes = import.meta.env.DEV
  ? [
      {
        path: '/dev',
        errorElement: <RouteError />,
        lazy: async () => ({
          Component: (await import('@/dev/DevScenariosPage')).DevScenariosPage,
        }),
      },
    ]
  : []

export const router = createBrowserRouter([
  ...devRoutes,
  // Every product route sits behind one guard (a pathless layout route), so
  // "signed out" is answered in exactly one place rather than per page. Only
  // /login and /design-preview/* live outside it.
  {
    element: <RequireAuth />,
    errorElement: <RouteError />,
    children: [
      // Today owns '/' as its own structurally separate top-level route
      // previously (now folded into the shared AppShell — see below); kept as
      // its own entry only because Review, right below, needs the same
      // "chrome-free/different-chrome by construction" treatment
      // design-preview already used, and Today's route already proved the
      // pattern works.
      {
        path: '/',
        element: <AppShell />,
        children: [
          { index: true, element: <TodayPage /> },
          { path: 'decks', element: <LibraryBrowserPage /> },
          { path: 'decks/:id', element: <LibraryDeckPage /> },
          { path: 'decks/:deckId/cards/new', element: <CardCreatePage /> },
          { path: 'roadmaps', element: <RoadmapsPage /> },
          { path: 'roadmaps/:id', element: <RoadmapEditorPage /> },
          { path: 'preview', element: <PreviewPage /> },
          { path: 'cards/:id/edit', element: <CardEditEntry /> },
          { path: 'cards/:id/study', element: <CardStudyPreviewPage /> },
          { path: 'progress', element: <ProgressPage /> },
          { path: 'progress/history', element: <ReviewHistoryPage /> },
          { path: 'progress/achievements', element: <AchievementsPage /> },
          { path: 'settings', element: <AccountSettingsPage /> },
          { path: 'settings/:section', element: <AccountSettingsPage /> },
          { path: 'about', element: <AboutPage /> },
          { path: 'help', element: <HelpPage /> },
          { path: 'help/contact', element: <HelpPage /> },
          { path: 'help/articles/:articleId', element: <HelpPage /> },
        ],
      },
      // Review is immersive (locked IA): no global nav, no logo, no sidebar. A
      // structurally separate route — the same "chrome-free by construction,
      // not by hiding AppShell's chrome with CSS" pattern design-preview uses
      // below — not a child of AppShell.
      { path: 'review', element: <ReviewPage /> },
      { path: 'onboarding', element: <OnboardingPage /> },
    ],
  },
  // Login is chrome-free by construction too: no AppShell ancestor, and
  // outside RequireAuth for the obvious reason.
  {
    path: 'login',
    element: <LoginPage />,
    errorElement: <RouteError />,
  },
  // Design-preview routes are a structurally separate top-level entry, not
  // children of AppShell — chrome-free by construction, not by hiding
  // AppShell's chrome with CSS.
  //
  // Only the six review-interaction previews remain, and they render the
  // production ReviewSessionScreen against fixtures, so they cannot drift from
  // /review. The Library previews that used to live here were a fork of
  // src/features/library and were deleted once production overtook them.
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
    ],
  },
])
