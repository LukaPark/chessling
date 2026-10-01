import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FakeWorker } from './testing/fakeWorker'

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

// 세션 플래그가 모듈 상태라 테스트마다 새로 불러온다.
async function load() {
  vi.resetModules()
  return import('./engines')
}

beforeEach(() => vi.stubGlobal('SharedArrayBuffer', globalThis.SharedArrayBuffer ?? class {}))
afterEach(() => vi.unstubAllGlobals())

describe('engines', () => {
  it('격리 여부로 빌드를 고른다', async () => {
    const { engineUrl } = await load()
    expect(engineUrl(true)).toBe('/engine/stockfish-19-lite.js')
    expect(engineUrl(false)).toBe('/engine/stockfish-19-lite-single.js')
  })

  it('crossOriginIsolated가 true일 때만 멀티스레드', async () => {
    const { isMultiThreaded } = await load()
    vi.stubGlobal('crossOriginIsolated', false)
    expect(isMultiThreaded()).toBe(false)
    vi.stubGlobal('crossOriginIsolated', true)
    expect(isMultiThreaded()).toBe(true)
  })

  it('멀티스레드 워커가 시작 전에 죽으면 싱글로 갈아타고 세션 내내 유지한다', async () => {
    vi.stubGlobal('crossOriginIsolated', true)
    const { createEngine, isMultiThreaded, subscribeEngineMode } = await load()
    const spawned: { multi: boolean; worker: FakeWorker }[] = []
    const factory = (multi: boolean) => {
      const worker = new FakeWorker(multi ? { crashOnUci: true } : {})
      spawned.push({ multi, worker })
      return worker
    }
    const analysis = createEngine({ Threads: 3, Hash: 64 }, factory)
    const play = createEngine({ Threads: 1, Hash: 16 }, factory)
    const listener = vi.fn()
    subscribeEngineMode(listener)

    await expect(analysis.analyze(START, { depth: 5 })).resolves.toMatchObject({ cancelled: false })
    expect(isMultiThreaded()).toBe(false)
    expect(listener).toHaveBeenCalledTimes(1)
    expect(spawned.map((s) => s.multi)).toEqual([true, false])
    expect(spawned[1].worker.sent).toContain('setoption name Threads value 1')

    // 다른 엔진은 멀티를 다시 시도하지 않고 처음부터 싱글로 띄운다.
    await expect(play.analyze(START, { depth: 5 })).resolves.toMatchObject({ cancelled: false })
    expect(spawned.map((s) => s.multi)).toEqual([true, false, false])
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('격리 환경이 아니면 처음부터 싱글이고 대체도 없다', async () => {
    vi.stubGlobal('crossOriginIsolated', false)
    const { createEngine } = await load()
    const kinds: boolean[] = []
    const engine = createEngine({ Threads: 1, Hash: 16 }, (multi) => {
      kinds.push(multi)
      return new FakeWorker({ crashOnUci: true })
    })
    await expect(engine.analyze(START, { depth: 5 })).rejects.toThrow()
    expect(kinds.every((m) => !m)).toBe(true)
  })
})
