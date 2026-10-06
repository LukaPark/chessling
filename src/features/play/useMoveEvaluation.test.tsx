// @vitest-environment jsdom
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EngineProvider, type Engines } from '../../app/EngineContext'
import { createFork, forkPlies } from '../../chess/fork'
import type { Color, Ply } from '../../chess/types'
import { FakeWorker, type FakeEngineScript } from '../../engine/testing/fakeWorker'
import { UciEngine, type SearchResult } from '../../engine/UciEngine'
import { MOVE_EVAL_DEPTH, useMoveEvaluation } from './useMoveEvaluation'

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

function pliesOf(moves: string[], startFen = START): Ply[] {
  const fork = createFork(
    { origin: { kind: 'classic', slug: 'opera-game' }, originPly: 0, startFen, playerColor: 'white', engineElo: 1500, title: 't' },
    1,
    'f1',
  )
  return forkPlies({ ...fork, moves })
}

const P0 = pliesOf([])
const AFTER_E4 = pliesOf(['e2e4'])
const AFTER_A3 = pliesOf(['a2a3'])

/** 포지션마다 엔진 결과를 정한다. 점수는 UCI처럼 둘 차례 기준 */
const SCRIPT: FakeEngineScript = {
  info: (fen) => {
    if (fen === START) return ['info depth 14 multipv 1 score cp 30 pv e2e4 e7e5', 'info depth 14 multipv 2 score cp 25 pv d2d4 d7d5']
    if (fen === AFTER_E4[1].fen) return ['info depth 14 multipv 1 score cp -30 pv e7e5 g1f3', 'info depth 14 multipv 2 score cp -35 pv c7c5']
    // a3 뒤 흑이 +1.20 (백 기준 −1.20): 백 손실 약 13.6%p → 실수
    if (fen === AFTER_A3[1].fen) return ['info depth 14 multipv 1 score cp 120 pv e7e5 e2e4', 'info depth 14 multipv 2 score cp 100 pv d7d5']
    return ['info depth 14 multipv 1 score cp 0 pv e7e5']
  },
  bestMove: (fen) => (fen === START ? 'e2e4' : 'e7e5'),
}

function setup(
  opts: { plies?: Ply[]; enabled?: boolean; analysis?: Engines['analysis']; playerColor?: Color; script?: FakeEngineScript; over?: boolean } = {},
) {
  const workers: FakeWorker[] = []
  const analysis =
    opts.analysis ??
    new UciEngine(() => {
      const w = new FakeWorker(opts.script ?? SCRIPT)
      workers.push(w)
      return w
    })
  const engines = { analysis, play: new UciEngine(() => new FakeWorker()) } as Engines
  const wrapper = ({ children }: { children: ReactNode }) => <EngineProvider engines={engines}>{children}</EngineProvider>
  const hook = renderHook(
    ({ plies, enabled, over }: { plies: Ply[]; enabled: boolean; over?: boolean }) =>
      useMoveEvaluation({ plies, playerColor: opts.playerColor ?? 'white', enabled, over: over ?? false, seed: 'f1' }),
    { wrapper, initialProps: { plies: opts.plies ?? P0, enabled: opts.enabled ?? true, over: opts.over } as { plies: Ply[]; enabled: boolean; over?: boolean } },
  )
  const goCount = () => workers.flatMap((w) => w.sent).filter((c) => c.startsWith('go')).length
  return { hook, analysis, goCount, workers }
}

afterEach(() => vi.restoreAllMocks())

const NF3_NF6_NC3 = pliesOf(['g1f3', 'g8f6', 'b1c3'])
const NC3_NF6_NF3 = pliesOf(['b1c3', 'g8f6', 'g1f3'])

describe('useMoveEvaluation', () => {
  it('최선이 아닌 수에는 판정과 더 나은 수, 코멘트를 낸다', async () => {
    const { hook, workers } = setup()
    // 내 차례에 지금 포지션을 미리 분석한다
    await waitFor(() => expect(workers[0]?.sent).toContain(`position fen ${START}`))
    hook.rerender({ plies: AFTER_A3, enabled: true })
    expect(hook.result.current.latest).toEqual({ index: 1, status: 'pending' })
    await waitFor(() => expect(hook.result.current.latest?.status).toBe('done'))
    const latest = hook.result.current.latest
    expect(latest).toMatchObject({ index: 1, status: 'done', label: 'mistake', betterUci: 'e2e4', betterSan: 'e4' })
    expect(latest?.status === 'done' && latest.comment).toBeTruthy()
    expect(hook.result.current.labels[1]).toBe('mistake')
    expect(workers[0].sent).toContain(`go depth ${MOVE_EVAL_DEPTH}`)
    expect(workers[0].sent).toContain('setoption name MultiPV value 2')
  })

  it('최선의 수는 더 나은 수 없이 최선', async () => {
    const { hook } = setup()
    hook.rerender({ plies: AFTER_E4, enabled: true })
    await waitFor(() => expect(hook.result.current.latest?.status).toBe('done'))
    expect(hook.result.current.latest).toMatchObject({ index: 1, label: 'best', betterUci: null, betterSan: null })
  })

  it('상대 수는 판정하지 않고, 카드는 내 마지막 수를 보여준다', async () => {
    const { hook } = setup()
    hook.rerender({ plies: AFTER_E4, enabled: true })
    // 상대가 바로 응수해도 내 수 판정은 끝까지 한다
    hook.rerender({ plies: pliesOf(['e2e4', 'e7e5']), enabled: true })
    await waitFor(() => expect(hook.result.current.latest?.status).toBe('done'))
    expect(hook.result.current.latest?.index).toBe(1)
    expect(hook.result.current.labels[1]).toBe('best')
    expect(hook.result.current.labels[2] ?? null).toBeNull()
  })

  it('무르면 물린 수의 판정을 지운다', async () => {
    const { hook } = setup()
    hook.rerender({ plies: AFTER_E4, enabled: true })
    await waitFor(() => expect(hook.result.current.labels[1]).toBe('best'))
    hook.rerender({ plies: P0, enabled: true })
    expect(hook.result.current.latest).toBeNull()
    expect(hook.result.current.labels[1] ?? null).toBeNull()
  })

  it('꺼져 있으면 분석하지 않고 아무것도 보여주지 않는다', async () => {
    const { hook, goCount } = setup({ enabled: false })
    hook.rerender({ plies: AFTER_A3, enabled: false })
    await new Promise((r) => setTimeout(r, 30))
    expect(goCount()).toBe(0)
    expect(hook.result.current.latest).toBeNull()
    expect(hook.result.current.labels).toEqual([])
  })

  it('켜 둔 채 판정이 끝난 뒤 끄면 판정을 숨긴다', async () => {
    const { hook } = setup()
    hook.rerender({ plies: AFTER_E4, enabled: true })
    await waitFor(() => expect(hook.result.current.labels[1]).toBe('best'))
    hook.rerender({ plies: AFTER_E4, enabled: false })
    expect(hook.result.current.latest).toBeNull()
    expect(hook.result.current.labels).toEqual([])
  })

  it('엔진 오류면 그 수는 판정 없이 넘어간다', async () => {
    const analysis = new UciEngine(() => new FakeWorker({ ...SCRIPT, crashOnGo: 1 }))
    const { hook } = setup({ analysis })
    hook.rerender({ plies: AFTER_E4, enabled: true })
    await waitFor(() => expect(hook.result.current.latest).toBeNull())
    expect(hook.result.current.labels[1] ?? null).toBeNull()
  })

  it('탐색이 취소되면 그 수는 판정 없이 넘어간다', async () => {
    const analyze = vi.fn(async (): Promise<SearchResult> => ({ lines: [], bestMove: null, cancelled: true }))
    const analysis = { analyze, stop: vi.fn() } as unknown as Engines['analysis']
    const { hook } = setup({ analysis })
    hook.rerender({ plies: AFTER_E4, enabled: true })
    await waitFor(() => expect(analyze).toHaveBeenCalled())
    await waitFor(() => expect(hook.result.current.latest).toBeNull())
    expect(hook.result.current.labels[1] ?? null).toBeNull()
  })

  it('무른 뒤 수순을 바꿔 같은 포지션에 오면(전위) 이전 수의 판정을 쓰지 않는다', async () => {
    // 1.Nf3 Nf6 뒤에는 Nc3가 최선, 1.Nc3 Nf6 뒤에는 e4가 최선. 점수는 모두 0
    const script: FakeEngineScript = {
      info: () => ['info depth 14 multipv 1 score cp 0 pv e2e4'],
      bestMove: (fen) => (fen === NF3_NF6_NC3[2].fen ? 'b1c3' : 'e2e4'),
    }
    expect(NF3_NF6_NC3[3].fen).toBe(NC3_NF6_NF3[3].fen)
    const { hook } = setup({ plies: NF3_NF6_NC3.slice(0, 1), script })
    hook.rerender({ plies: NF3_NF6_NC3, enabled: true })
    await waitFor(() => expect(hook.result.current.latest).toMatchObject({ index: 3, status: 'done', label: 'best' }))
    hook.rerender({ plies: NC3_NF6_NF3, enabled: true })
    expect(hook.result.current.latest).toEqual({ index: 3, status: 'pending' })
    await waitFor(() => expect(hook.result.current.latest?.status).toBe('done'))
    expect(hook.result.current.latest).toMatchObject({ index: 3, label: 'excellent', betterUci: 'e2e4', betterSan: 'e4' })
  })

  it('탐색 중에 무르면 그 수의 판정은 나오지 않는다', async () => {
    const { hook, analysis, goCount } = setup({ script: { ...SCRIPT, holdGoCount: 1 } })
    hook.rerender({ plies: AFTER_E4, enabled: true })
    expect(hook.result.current.latest).toEqual({ index: 1, status: 'pending' })
    await waitFor(() => expect(goCount()).toBe(1))
    hook.rerender({ plies: P0, enabled: true })
    analysis.stop() // 붙잡힌 탐색을 풀어 준다
    await new Promise((r) => setTimeout(r, 30))
    expect(hook.result.current.latest).toBeNull()
    expect(hook.result.current.labels[1] ?? null).toBeNull()
  })

  it('탐색 중에 끄면 엔진을 멈추고, 다시 켜면 실패가 아니라 새로 평가한다', async () => {
    const { hook, analysis, goCount } = setup({ script: { ...SCRIPT, holdGoCount: 1 } })
    const stop = vi.spyOn(analysis, 'stop')
    hook.rerender({ plies: AFTER_E4, enabled: true })
    await waitFor(() => expect(goCount()).toBe(1)) // 탐색이 엔진에 들어가 붙잡혀 있다
    hook.rerender({ plies: AFTER_E4, enabled: false })
    expect(stop).toHaveBeenCalled()
    await new Promise((r) => setTimeout(r, 30))
    expect(hook.result.current.latest).toBeNull()
    hook.rerender({ plies: AFTER_E4, enabled: true })
    expect(hook.result.current.latest).toEqual({ index: 1, status: 'pending' })
    await waitFor(() => expect(hook.result.current.latest).toMatchObject({ status: 'done', label: 'best' }))
  })

  it('탐색 중에 언마운트해도 엔진을 멈추고 경고 없이 끝난다', async () => {
    const error = vi.spyOn(console, 'error')
    const { hook, analysis, goCount } = setup({ script: { ...SCRIPT, holdGoCount: 1 } })
    const stop = vi.spyOn(analysis, 'stop')
    hook.rerender({ plies: AFTER_E4, enabled: true })
    await waitFor(() => expect(goCount()).toBe(1))
    hook.unmount()
    expect(stop).toHaveBeenCalled()
    await new Promise((r) => setTimeout(r, 30))
    expect(error).not.toHaveBeenCalled()
  })

  it('끝난 대국에서는 내 차례여도 미리 분석하지 않는다', async () => {
    const { goCount } = setup({ over: true })
    await new Promise((r) => setTimeout(r, 30))
    expect(goCount()).toBe(0)
  })

  it('처음 열었을 때 이미 둔 수는 평가하지 않는다(새로고침하면 지워진다)', async () => {
    const { hook, workers } = setup({ plies: pliesOf(['e2e4', 'e7e5']) })
    // 내 차례라 지금 포지션은 미리 분석하지만 1.e4는 판정하지 않는다
    await waitFor(() => expect(workers[0]?.sent).toContain(`position fen ${pliesOf(['e2e4', 'e7e5'])[2].fen}`))
    expect(workers[0].sent).not.toContain(`position fen ${START}`)
    expect(hook.result.current.latest).toBeNull()
    expect(hook.result.current.labels[1] ?? null).toBeNull()
    // 이번 세션에 둔 수는 평가한다
    hook.rerender({ plies: pliesOf(['e2e4', 'e7e5', 'g1f3']), enabled: true })
    expect(hook.result.current.latest).toEqual({ index: 3, status: 'pending' })
  })

  it('상대 수 앞뒤 포지션이 분석돼 있으면 상대 블런더 뒤 내 큰 손실을 놓침으로 판정한다', async () => {
    const E4 = pliesOf(['e2e4'])
    const F6 = pliesOf(['e2e4', 'f7f6'])
    const A3 = pliesOf(['e2e4', 'f7f6', 'a2a3'])
    const script: FakeEngineScript = {
      // 점수는 둘 차례 기준. f6 뒤 백 +3.00(흑 블런더), a3 뒤 백 +1.00(백 손실 약 16%p)
      info: (fen) =>
        fen === F6[2].fen
          ? ['info depth 14 multipv 1 score cp 300 pv d2d4']
          : fen === A3[3].fen
            ? ['info depth 14 multipv 1 score cp -100 pv e7e5']
            : ['info depth 14 multipv 1 score cp 0 pv e7e5'],
      bestMove: (fen) => (fen === START ? 'e2e4' : fen === F6[2].fen ? 'd2d4' : 'e7e5'),
    }
    const { hook } = setup({ script })
    hook.rerender({ plies: E4, enabled: true })
    await waitFor(() => expect(hook.result.current.labels[1]).toBe('best'))
    hook.rerender({ plies: F6, enabled: true })
    hook.rerender({ plies: A3, enabled: true })
    await waitFor(() => expect(hook.result.current.latest?.status).toBe('done'))
    expect(hook.result.current.labels[3]).toBe('miss')
    expect(hook.result.current.labels[2] ?? null).toBeNull() // 상대 수는 보여주지 않는다
  })
})
