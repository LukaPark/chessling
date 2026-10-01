import { afterEach, describe, expect, it, vi } from 'vitest'
import { engineUrl, isMultiThreaded } from './engines'

afterEach(() => vi.unstubAllGlobals())

describe('engines', () => {
  it('격리 여부로 빌드를 고른다', () => {
    expect(engineUrl(true)).toBe('/engine/stockfish-19-lite.js')
    expect(engineUrl(false)).toBe('/engine/stockfish-19-lite-single.js')
  })
  it('crossOriginIsolated가 true일 때만 멀티스레드', () => {
    vi.stubGlobal('crossOriginIsolated', false)
    expect(isMultiThreaded()).toBe(false)
    vi.stubGlobal('crossOriginIsolated', true)
    expect(isMultiThreaded()).toBe(true)
  })
})
