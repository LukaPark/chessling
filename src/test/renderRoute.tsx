import { QueryClient } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { AppProviders } from '../app/AppProviders'
import type { Engines } from '../app/EngineContext'
import { routes } from '../app/routes'
import { FakeWorker } from '../engine/testing/fakeWorker'
import { UciEngine } from '../engine/UciEngine'
import { createMemoryStore, type Store } from '../storage/db'

export function renderRoute(
  path: string,
  opts: { store?: Store; engines?: Partial<Engines>; queryClient?: QueryClient } = {},
) {
  const store = opts.store ?? createMemoryStore()
  const engines: Engines = {
    analysis: opts.engines?.analysis ?? new UciEngine(() => new FakeWorker()),
    play: opts.engines?.play ?? new UciEngine(() => new FakeWorker()),
  }
  const queryClient = opts.queryClient ?? new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const utils = render(
    <AppProviders store={store} engines={engines} queryClient={queryClient}>
      <RouterProvider router={router} />
    </AppProviders>,
  )
  return { ...utils, router, store, engines, queryClient }
}
