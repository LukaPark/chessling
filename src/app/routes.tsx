import { lazy, Suspense, type ComponentType, type ReactNode } from 'react'
import type { RouteObject } from 'react-router'
import { HomePage } from '../features/home/HomePage'
import { NotFound } from '../features/NotFound'
import * as g from '../styles/features/gameLayout.css'
import { Layout } from './Layout'

/** 홈을 뺀 페이지는 처음 방문할 때 불러온다. */
function page<M>(load: () => Promise<M>, pick: (m: M) => ComponentType): ReactNode {
  const Page = lazy(async () => ({ default: pick(await load()) }))
  return (
    <Suspense fallback={<p className={g.note}>불러오는 중…</p>}>
      <Page />
    </Suspense>
  )
}

export const routes: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'licenses', element: page(() => import('../features/licenses/LicensesPage'), (m) => m.LicensesPage) },
      { path: 'game/*', element: page(() => import('../features/viewer/ViewerPage'), (m) => m.ViewerPage) },
      { path: 'player/:platform/:username', element: page(() => import('../features/player/PlayerPage'), (m) => m.PlayerPage) },
      { path: 'events', element: page(() => import('../features/events/EventsPage'), (m) => m.EventsPage) },
      { path: 'events/:tourId', element: page(() => import('../features/events/EventDetailPage'), (m) => m.EventDetailPage) },
      { path: 'classics', element: page(() => import('../features/classics/ClassicsPage'), (m) => m.ClassicsPage) },
      { path: 'play/:forkId', element: page(() => import('../features/play/PlayPage'), (m) => m.PlayPage) },
      { path: 'settings', element: page(() => import('../features/settings/SettingsPage'), (m) => m.SettingsPage) },
      { path: 'forks', element: page(() => import('../features/forks/ForksPage'), (m) => m.ForksPage) },
      { path: '*', element: <NotFound /> },
    ],
  },
]
