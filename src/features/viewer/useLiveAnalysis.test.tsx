// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EngineProvider, type Engines } from '../../app/EngineContext'
import { useLiveAnalysis } from './useLiveAnalysis'

const F1 = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const F2 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'
const F3 = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2'

afterEach(() => vi.useRealTimers())

function setup(enabled = true) {
  const analyze = vi.fn(async () => ({
    lines: [{ depth: 18, multipv: 1, score: { cp: 12 }, pv: ['g1f3'] }],
    bestMove: 'g1f3',
    cancelled: false,
  }))
  const engines = { analysis: { analyze, stop: vi.fn() }, play: {} } as unknown as Engines
  const wrapper = ({ children }: { children: ReactNode }) => <EngineProvider engines={engines}>{children}</EngineProvider>
  const hook = renderHook(({ fen }) => useLiveAnalysis(fen, enabled), { wrapper, initialProps: { fen: F1 } })
  return { analyze, hook }
}

describe('useLiveAnalysis', () => {
  it('150ms 안에 연달아 바뀌면 마지막 포지션만 분석한다', async () => {
    vi.useFakeTimers()
    const { analyze, hook } = setup()
    hook.rerender({ fen: F2 })
    hook.rerender({ fen: F3 })
    await act(async () => {
      vi.advanceTimersByTime(150)
    })
    expect(analyze).toHaveBeenCalledTimes(1)
    expect(analyze).toHaveBeenCalledWith(F3, { depth: 18, multiPv: 3 }, expect.any(Function))
    expect(hook.result.current.lines[0].pv).toEqual(['g1f3'])
  })

  it('disabled면 분석하지 않는다', async () => {
    vi.useFakeTimers()
    const { analyze } = setup(false)
    await act(async () => {
      vi.advanceTimersByTime(500)
    })
    expect(analyze).not.toHaveBeenCalled()
  })

  it('이후 분석이 성공하면 error를 지운다', async () => {
    vi.useFakeTimers()
    const { analyze, hook } = setup()
    analyze.mockRejectedValueOnce(new Error('boom'))
    await act(async () => {
      vi.advanceTimersByTime(150)
    })
    expect(hook.result.current.error).toBeInstanceOf(Error)
    hook.rerender({ fen: F2 })
    await act(async () => {
      vi.advanceTimersByTime(150)
    })
    expect(hook.result.current.error).toBeNull()
  })
})
