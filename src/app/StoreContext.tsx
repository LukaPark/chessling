import { createContext, useContext, type ReactNode } from 'react'
import type { Store } from '../storage/db'

const StoreContext = createContext<Store | null>(null)

export function StoreProvider({ store, children }: { store: Store; children: ReactNode }) {
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}

export function useStore(): Store {
  const store = useContext(StoreContext)
  if (!store) throw new Error('StoreProvider가 없습니다')
  return store
}
