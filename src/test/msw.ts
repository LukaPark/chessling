import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll } from 'vitest'

export function useMswServer() {
  const server = setupServer()
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())
  return server
}
