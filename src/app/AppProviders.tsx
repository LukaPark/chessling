import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { MotionConfig } from 'motion/react'
import type { ReactNode } from 'react'
import type { Store } from '../storage/db'
import { EngineProvider, type Engines } from './EngineContext'
import { StoreProvider } from './StoreContext'

export function AppProviders(props: { store: Store; engines: Engines; queryClient: QueryClient; children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <QueryClientProvider client={props.queryClient}>
        <StoreProvider store={props.store}>
          <EngineProvider engines={props.engines}>{props.children}</EngineProvider>
        </StoreProvider>
      </QueryClientProvider>
    </MotionConfig>
  )
}
