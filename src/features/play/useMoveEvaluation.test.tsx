// @vitest-environment jsdom
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
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

function setup(opts: { plies?: Ply[]; enabled?: boolean; analysis?: Engines['analysis']; playerColor?: Color } = {}) {
  const workers: FakeWorker[] = []
  const analysis =
    opts.analysis ??
    new UciEngine(() => {
      const w = new FakeWorker(SCRIPT)
      workers.push(w)
      return w
    })
  const engines = { analysis, play: new UciEngine(() => new FakeWorker()) } as Engines
  const wrapper = ({ children }: { children: ReactNode }) => <EngineProvider engines={engines}>{children}</EngineProvider>
  const hook = renderHook(
    ({ plies, enabled }) => useMoveEvaluation({ plies, playerColor: opts.playerColor ?? 'white', enabled, seed: 'f1' }),
    { wrapper, initialProps: { plies: opts.plies ?? P0, enabled: opts.enabled ?? true } },
  )
  const goCount = () => workers.flatMap((w) => w.sent).filter((c) => c.startsWith('go')).length
  return { hook, analysis, goCount, workers }
}

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
})
