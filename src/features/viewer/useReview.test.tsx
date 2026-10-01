// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { EngineProvider } from '../../app/EngineContext'
import { StoreProvider } from '../../app/StoreContext'
import type { GameRef } from '../../chess/gameRef'
import { pgnToPlies } from '../../chess/pgn'
import { FakeWorker, type FakeEngineScript } from '../../engine/testing/fakeWorker'
import { UciEngine } from '../../engine/UciEngine'
import { getClassic } from '../../sources/classics'
import { createMemoryStore, type Store } from '../../storage/db'
import { buildReview } from '../../engine/review'
import { useReview } from './useReview'

const REF: GameRef = { kind: 'classic', slug: 'opera-game' }
const PLIES = pgnToPlies(getClassic('opera-game')!.pgn)

function setup(
  store: Store,
  script: FakeEngineScript = { info: () => ['info depth 14 multipv 1 score cp 20 pv e2e4'] },
  cacheable = true,
) {
  const factory = vi.fn(() => new FakeWorker(script))
  const analysis = new UciEngine(factory)
  const wrapper = ({ children }: { children: ReactNode }) => (
    <StoreProvider store={store}>
      <EngineProvider engines={{ analysis, play: analysis }}>{children}</EngineProvider>
    </StoreProvider>
  )
  const hook = renderHook(() => useReview(REF, PLIES, cacheable), { wrapper })
  return { hook, factory }
}

describe('useReview', () => {
  it('캐시가 있으면 엔진 없이 바로 done', async () => {
    const store = createMemoryStore()
    const review = {
      version: 2 as const,
      depth: 14,
      positions: PLIES.map(() => ({ score: { cp: 0 }, best: null, pv: [], second: null, legalMoves: 20 })),
      labels: [],
      accuracy: { white: 90, black: 80 },
    }
    await store.reviews.put({ key: 'classic/opera-game', depth: 14, review, createdAt: 1 })
    const { hook, factory } = setup(store)
    await waitFor(() => expect(hook.result.current.state.status).toBe('done'))
    expect(factory).not.toHaveBeenCalled()
  })

  it('캐시된 리뷰는 불러올 때 현재 기준으로 판정·정확도를 다시 계산한다', async () => {
    const store = createMemoryStore()
    const positions = PLIES.map(() => ({ score: { cp: 0 }, best: null, pv: [], second: null, legalMoves: 20 }))
    const stale = { version: 2 as const, depth: 14, positions, labels: [], accuracy: { white: 1, black: 1 } }
    await store.reviews.put({ key: 'classic/opera-game', depth: 14, review: stale, createdAt: 1 })
    const { hook } = setup(store)
    await waitFor(() => expect(hook.result.current.state.status).toBe('done'))
    const state = hook.result.current.state
    expect(state).toEqual({ status: 'done', review: buildReview(PLIES, positions, 14) })
    if (state.status === 'done') {
      expect(state.review.labels).toHaveLength(PLIES.length)
      expect(state.review.accuracy).toEqual({ white: 100, black: 100 })
    }
  })

  it('start하면 진행률을 거쳐 done이 되고 캐시에 저장한다', async () => {
    const store = createMemoryStore()
    const { hook } = setup(store)
    await act(async () => {
      await hook.result.current.start()
    })
    const state = hook.result.current.state
    expect(state.status).toBe('done')
    if (state.status === 'done') expect(state.review.positions).toHaveLength(PLIES.length)
    expect(await store.reviews.get('classic/opera-game')).toBeDefined()
  })

  it('진행 중에 언마운트하면 저장하지 않는다', async () => {
    const store = createMemoryStore()
    const { hook } = setup(store, { holdGoCount: 1 })
    act(() => {
      void hook.result.current.start()
    })
    await waitFor(() => expect(hook.result.current.state.status).toBe('running'))
    hook.unmount()
    await new Promise((r) => setTimeout(r, 20))
    expect(await store.reviews.get('classic/opera-game')).toBeUndefined()
  })

  it('실패할 때마다 attempt가 증가한다', async () => {
    const store = createMemoryStore()
    vi.spyOn(store.reviews, 'put').mockRejectedValue(new Error('boom'))
    const { hook } = setup(store)
    await act(async () => {
      await hook.result.current.start()
    })
    const first = hook.result.current.state
    expect(first.status).toBe('error')
    await act(async () => {
      await hook.result.current.start()
    })
    const second = hook.result.current.state
    expect(second.status).toBe('error')
    if (first.status === 'error' && second.status === 'error') expect(second.attempt).toBeGreaterThan(first.attempt)
  })

  it('진행 중인 대국(cacheable=false)은 리뷰를 캐시에 저장하지 않는다', async () => {
    const store = createMemoryStore()
    const { hook } = setup(store, undefined, false)
    await act(async () => {
      await hook.result.current.start()
    })
    expect(hook.result.current.state.status).toBe('done')
    expect(await store.reviews.get('classic/opera-game')).toBeUndefined()
  })

  it('수 개수가 다른 캐시된 리뷰는 무시한다', async () => {
    const store = createMemoryStore()
    const review = { version: 2 as const, depth: 14, positions: [], labels: [], accuracy: { white: 90, black: 80 } }
    await store.reviews.put({ key: 'classic/opera-game', depth: 14, review, createdAt: 1 })
    const { hook } = setup(store)
    await new Promise((r) => setTimeout(r, 30))
    expect(hook.result.current.state.status).toBe('idle')
  })

  it('버전이 다른 캐시는 무시한다', async () => {
    const store = createMemoryStore()
    const old = { depth: 14, positions: PLIES.map(() => ({ score: { cp: 0 }, best: null })), labels: [], accuracy: { white: 1, black: 1 } }
    await store.reviews.put({ key: 'classic/opera-game', depth: 14, review: old as never, createdAt: 1 })
    const { hook } = setup(store)
    await new Promise((r) => setTimeout(r, 20))
    expect(hook.result.current.state.status).toBe('idle')
  })
})
