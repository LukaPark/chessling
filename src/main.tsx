import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { AppProviders } from './app/AppProviders'
import { createQueryClient } from './app/queryClient'
import { routes } from './app/routes'
import { getAnalysisEngine, getPlayEngine } from './engine/engines'
import { openStore } from './storage/db'
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css'
import './styles/index.css'

const store = await openStore()
const router = createBrowserRouter(routes)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders store={store} engines={{ analysis: getAnalysisEngine(), play: getPlayEngine() }} queryClient={createQueryClient()}>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
)
