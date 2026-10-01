import { createContext, useContext, type ReactNode } from 'react'
import type { UciEngine } from '../engine/UciEngine'

export interface Engines {
  analysis: UciEngine
  play: UciEngine
}

const EngineContext = createContext<Engines | null>(null)

export function EngineProvider({ engines, children }: { engines: Engines; children: ReactNode }) {
  return <EngineContext.Provider value={engines}>{children}</EngineContext.Provider>
}

export function useEngines(): Engines {
  const engines = useContext(EngineContext)
  if (!engines) throw new Error('EngineProvider가 없습니다')
  return engines
}
