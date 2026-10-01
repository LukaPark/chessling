import 'fake-indexeddb/auto'
import { describe, expect, it, vi } from 'vitest'
import { createFork } from '../chess/fork'
import { createMemoryStore, openDexieStore, openStore, type Store } from './db'

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const fork = (id: string, updatedAt: number) => ({
  ...createFork(
    { origin: { kind: 'classic' as const, slug: 'opera-game' }, originPly: 3, startFen: START, playerColor: 'white' as const, engineElo: 1800, title: id },
    updatedAt,
    id,
  ),
})

describe.each<[string, () => Promise<Store>]>([
  ['dexie', () => openDexieStore(`test-${crypto.randomUUID()}`)],
  ['memory', async () => createMemoryStore()],
])('%s store', (name, make) => {
  it('persistent 플래그', async () => {
    expect((await make()).persistent).toBe(name === 'dexie')
  })

  it('fork put/get/list/delete', async () => {
    const store = await make()
    await store.forks.put(fork('a', 1))
    await store.forks.put(fork('b', 3))
    await store.forks.put(fork('c', 2))
    expect((await store.forks.get('a'))?.originPly).toBe(3)
    expect((await store.forks.list()).map((f) => f.id)).toEqual(['b', 'c', 'a'])
    await store.forks.delete('b')
    expect(await store.forks.get('b')).toBeUndefined()
  })

  it('저장한 뒤 원본을 바꿔도 저장본은 그대로', async () => {
    const store = await make()
    const f = fork('a', 1)
    await store.forks.put(f)
    f.moves.push('e2e4')
    expect((await store.forks.get('a'))?.moves).toEqual([])
  })

  it('review put/get', async () => {
    const store = await make()
    const review = {
      version: 2 as const,
      depth: 14,
      positions: [{ score: { cp: 0 }, best: null, pv: [], second: null, legalMoves: 20 }],
      labels: [null],
      accuracy: { white: null, black: null },
    }
    await store.reviews.put({ key: 'classic/opera-game', depth: 14, review, createdAt: 1 })
    expect((await store.reviews.get('classic/opera-game'))?.review).toEqual(review)
    expect(await store.reviews.get('nope')).toBeUndefined()
  })
})

describe('openStore', () => {
  it('IndexedDB를 열 수 없으면 메모리 저장소로 대체한다', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const store = await openStore('x', () => Promise.reject(new Error('blocked')))
    expect(store.persistent).toBe(false)
  })
})
