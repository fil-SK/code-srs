import { createBrowserRouter } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { ReviewPage } from '@/features/review/ReviewPage'
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
      { path: 'review', element: <ReviewPage /> },
      { path: 'browse', element: <BrowsePage /> },
      { path: 'cards/new', element: <CardEditorPage /> },
      { path: 'cards/:id/edit', element: <CardEditorPage /> },
      { path: 'drafts', element: <DraftsPage /> },
      { path: 'stats', element: <StatsPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
])
