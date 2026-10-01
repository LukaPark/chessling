import { describe, expect, it } from 'vitest'
import { PgnError } from '../chess/pgn'
import { HttpError } from '../sources/http'
import { shouldRetry } from './queryClient'

describe('shouldRetry', () => {
  it('server/network만 2회까지 재시도', () => {
    expect(shouldRetry(0, new HttpError('server', 500, ''))).toBe(true)
    expect(shouldRetry(1, new HttpError('network', 0, ''))).toBe(true)
    expect(shouldRetry(2, new HttpError('server', 500, ''))).toBe(false)
  })
  it('4xx·PGN 오류는 재시도하지 않는다', () => {
    expect(shouldRetry(0, new HttpError('not_found', 404, ''))).toBe(false)
    expect(shouldRetry(0, new HttpError('rate_limited', 429, ''))).toBe(false)
    expect(shouldRetry(0, new PgnError('x'))).toBe(false)
  })
})
