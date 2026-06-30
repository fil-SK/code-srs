import { createBrowserRouter } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { DecksPage } from '@/features/decks/DecksPage'
import { DeckDetailPage } from '@/features/decks/DeckDetailPage'
import { ReviewPage } from '@/features/review/ReviewPage'
import { PreviewPage } from '@/features/preview/PreviewPage'
import { BrowsePage } from '@/features/cards/BrowsePage'
import { CardEditorPage } from '@/features/cards/CardEditorPage'
import { DraftsPage } from '@/features/drafts/DraftsPage'
import { StatsPage } from '@/features/stats/StatsPage'
import { SettingsPage } from '@/features/settings/SettingsPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'decks', element: <DecksPage /> },
      { path: 'decks/:id', element: <DeckDetailPage /> },
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
])
