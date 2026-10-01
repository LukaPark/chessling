import { QueryClient } from '@tanstack/react-query'
import { HttpError } from '../sources/http'

export function shouldRetry(failureCount: number, error: unknown): boolean {
  return error instanceof HttpError && (error.kind === 'server' || error.kind === 'network') && failureCount < 2
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: shouldRetry, refetchOnWindowFocus: false, staleTime: 60_000 } },
  })
}
