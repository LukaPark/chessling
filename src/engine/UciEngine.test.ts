import { describe, expect, it, vi } from 'vitest'
import { EngineCrashedError, UciEngine } from './UciEngine'
import { FakeWorker, type FakeEngineScript } from './testing/fakeWorker'

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'

function setup(scriptFor: (index: number) => FakeEngineScript = () => ({}), options = {}) {
  const workers: FakeWorker[] = []
  const engine = new UciEngine(() => {
    const w = new FakeWorker(scriptFor(workers.length))
    workers.push(w)
    return w
  }, options)
  return { engine, workers }
}

describe('UciEngine', () => {
  it('핸드셰이크 후 백 기준 점수로 돌려준다', async () => {
    const { engine, workers } = setup(() => ({
      info: () => ['info depth 12 seldepth 15 multipv 1 score cp 50 nodes 100 pv e7e5 g1f3'],
      bestMove: () => 'e7e5',
    }))
    const r = await engine.analyze(AFTER_E4, { depth: 12 })
    expect(r).toEqual({
      cancelled: false,
      bestMove: 'e7e5',
      lines: [{ depth: 12, multipv: 1, score: { cp: -50 }, pv: ['e7e5', 'g1f3'] }],
    })
    expect(workers[0].sent).toEqual(['uci', 'isready', `position fen ${AFTER_E4}`, 'go depth 12'])
  })

  it('기본 옵션은 uci와 isready 사이에 보낸다', async () => {
    const { engine, workers } = setup(() => ({}), { Threads: 2, Hash: 64 })
    await engine.analyze(START, { depth: 1 })
    expect(workers[0].sent.slice(0, 4)).toEqual([
      'uci',
      'setoption name Threads value 2',
      'setoption name Hash value 64',
      'isready',
    ])
  })

  it('MultiPV 줄을 onInfo로 전달한다', async () => {
    const { engine, workers } = setup(() => ({
      info: () => ['info depth 5 multipv 1 score cp 30 pv e2e4', 'info depth 5 multipv 2 score cp 20 pv d2d4'],
    }))
    const onInfo = vi.fn()
    const r = await engine.analyze(START, { depth: 5, multiPv: 2 }, onInfo)
    expect(workers[0].sent).toContain('setoption name MultiPV value 2')
    expect(r.lines.map((l) => l.pv[0])).toEqual(['e2e4', 'd2d4'])
    expect(onInfo).toHaveBeenLastCalledWith(r.lines)
  })

  it('bound 줄은 무시한다', async () => {
    const { engine } = setup(() => ({ info: () => ['info depth 5 multipv 1 score cp 10 lowerbound pv e2e4'] }))
    expect((await engine.analyze(START, { depth: 5 })).lines).toEqual([])
  })

  it('마지막 요청만 실행한다 (latest-wins)', async () => {
    const { engine, workers } = setup(() => ({ holdGoCount: 1 }))
    const p1 = engine.analyze(START, { depth: 20 })
    await vi.waitFor(() => expect(workers[0]?.sent).toContain('go depth 20'))
    const p2 = engine.analyze(AFTER_E4, { depth: 20 })
    const p3 = engine.analyze(AFTER_E4, { depth: 10 })
    await expect(p1).resolves.toMatchObject({ cancelled: true, bestMove: null })
    await expect(p2).resolves.toMatchObject({ cancelled: true })
    await expect(p3).resolves.toMatchObject({ cancelled: false, bestMove: 'e2e4' })
    expect(workers[0].sent.filter((c) => c.startsWith('go'))).toEqual(['go depth 20', 'go depth 10'])
  })

  it('실행 중에 abort하면 cancelled', async () => {
    const { engine, workers } = setup(() => ({ holdGoCount: 1 }))
    const ac = new AbortController()
    const p = engine.analyze(START, { depth: 20, signal: ac.signal })
    await vi.waitFor(() => expect(workers[0]?.sent).toContain('go depth 20'))
    ac.abort()
    await expect(p).resolves.toMatchObject({ cancelled: true })
  })

  it('이미 abort된 요청은 워커를 띄우지 않는다', async () => {
    const { engine, workers } = setup()
    const ac = new AbortController()
    ac.abort()
    await expect(engine.analyze(START, { signal: ac.signal })).resolves.toMatchObject({ cancelled: true })
    expect(workers).toHaveLength(0)
  })

  it('크래시하면 워커를 다시 만들고 1회 재시도한다', async () => {
    const { engine, workers } = setup((i) => (i === 0 ? { crashOnGo: 1 } : { bestMove: () => 'd2d4' }))
    const r = await engine.analyze(START, { depth: 5 })
    expect(r.bestMove).toBe('d2d4')
    expect(workers).toHaveLength(2)
    expect(workers[0].terminated).toBe(true)
  })

  it('두 번 크래시하면 EngineCrashedError', async () => {
    const { engine } = setup(() => ({ crashOnGo: 1 }))
    await expect(engine.analyze(START, { depth: 5 })).rejects.toBeInstanceOf(EngineCrashedError)
  })

  it('bestMove는 세기를 제한하고 movetime으로 탐색한다', async () => {
    const { engine, workers } = setup()
    await expect(engine.bestMove(START, { movetime: 300, elo: 1500 })).resolves.toBe('e2e4')
    expect(workers[0].sent).toEqual(
      expect.arrayContaining([
        'setoption name UCI_LimitStrength value true',
        'setoption name UCI_Elo value 1500',
        'go movetime 300',
      ]),
    )
  })

  it('같은 Elo면 옵션을 다시 보내지 않는다', async () => {
    const { engine, workers } = setup()
    await engine.bestMove(START, { movetime: 100, elo: 1500 })
    await engine.bestMove(START, { movetime: 100, elo: 1500 })
    expect(workers[0].sent.filter((c) => c.includes('UCI_Elo'))).toHaveLength(1)
  })
  it('dispose 중인 탐색은 cancelled로 끝나고 이후 analyze는 새 워커로 동작한다', async () => {
    const { engine, workers } = setup((i) => (i === 0 ? { holdGoCount: 1 } : {}))
    const p = engine.analyze(START, { depth: 20 })
    await vi.waitFor(() => expect(workers[0]?.sent).toContain('go depth 20'))
    engine.dispose()
    await expect(p).resolves.toMatchObject({ cancelled: true, bestMove: null })
    await expect(engine.analyze(START, { depth: 5 })).resolves.toMatchObject({ cancelled: false, bestMove: 'e2e4' })
    expect(workers).toHaveLength(2)
  })

  it('핸드셰이크 중 dispose해도 cancelled로 끝난다', async () => {
    const { engine } = setup()
    const p = engine.analyze(START, { depth: 5 })
    engine.dispose()
    await expect(p).resolves.toMatchObject({ cancelled: true })
  })

  it('크래시로 워커를 다시 만들어도 setOptions 옵션을 다시 적용한다', async () => {
    const { engine, workers } = setup((i) => (i === 0 ? { crashOnGo: 1 } : {}))
    await expect(engine.bestMove(START, { movetime: 100, elo: 1500 })).resolves.toBe('e2e4')
    expect(workers).toHaveLength(2)
    const sent = workers[1].sent
    const go = sent.findIndex((c) => c.startsWith('go'))
    expect(sent.indexOf('setoption name UCI_LimitStrength value true')).toBeGreaterThan(-1)
    expect(sent.indexOf('setoption name UCI_LimitStrength value true')).toBeLessThan(go)
    expect(sent.indexOf('setoption name UCI_Elo value 1500')).toBeGreaterThan(-1)
    expect(sent.indexOf('setoption name UCI_Elo value 1500')).toBeLessThan(go)
  })

  it('Elo가 바뀌면 진행 중인 탐색을 멈춘 뒤 옵션을 보낸다', async () => {
    const { engine, workers } = setup(() => ({ holdGoCount: 1 }))
    const p = engine.analyze(START, { depth: 20 })
    await vi.waitFor(() => expect(workers[0]?.sent).toContain('go depth 20'))
    const b = engine.bestMove(START, { movetime: 100, elo: 1400 })
    await expect(p).resolves.toMatchObject({ cancelled: true })
    await expect(b).resolves.toBe('e2e4')
    const sent = workers[0].sent
    expect(sent.indexOf('setoption name UCI_Elo value 1400')).toBeGreaterThan(sent.indexOf('stop'))
  })
})
