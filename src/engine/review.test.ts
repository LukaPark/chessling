import { describe, expect, it, vi } from 'vitest'
import { pgnToPlies } from '../chess/pgn'
import { getClassic } from '../sources/classics'
import { MATED_CP, type Score } from './classify'
import { countJudgments } from './judge'
import { analyzePosition, buildReview, judgePly, REVIEW_VERSION, reviewGame, terminalScore, type ReviewedPosition } from './review'
import type { SearchResult } from './UciEngine'

const SCHOLAR = pgnToPlies('1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0')
const SCORES: Score[] = [{ cp: 30 }, { cp: 30 }, { cp: 30 }, { cp: 20 }, { cp: 40 }, { cp: 40 }, { mate: 1 }]
const BEST = ['e2e4', 'e7e5', 'g1f3', 'g7g6', 'd2d3', 'g7g6', 'h5f7']

function fakeEngine(onCall?: (n: number) => void) {
  let n = 0
  return {
    analyze: vi.fn(async (): Promise<SearchResult> => {
      const i = n++
      onCall?.(n)
      return {
        cancelled: false,
        bestMove: BEST[i],
        lines: [
          { depth: 14, multipv: 1, score: SCORES[i], pv: [BEST[i]] },
          { depth: 14, multipv: 2, score: SCORES[i], pv: ['a2a3'] },
        ],
      }
    }),
  }
}

describe('terminalScore', () => {
  it('메이트·스테일메이트·진행 중', () => {
    expect(terminalScore(SCHOLAR[7].fen)).toEqual({ cp: MATED_CP })
    expect(terminalScore('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1')).toEqual({ cp: 0 })
    expect(terminalScore(SCHOLAR[0].fen)).toBeNull()
  })
})

describe('reviewGame v2', () => {
  it('MultiPV 2로 분석하고 판정·정확도·버전을 채운다', async () => {
    const engine = fakeEngine()
    const onProgress = vi.fn()
    const review = await reviewGame(engine, SCHOLAR, { onProgress })
    expect(review.version).toBe(REVIEW_VERSION)
    expect(engine.analyze).toHaveBeenCalledTimes(7)
    expect(engine.analyze).toHaveBeenCalledWith(SCHOLAR[0].fen, expect.objectContaining({ depth: 14, multiPv: 2 }))
    expect(onProgress).toHaveBeenLastCalledWith(8, 8, expect.any(Array))
    expect(review.positions[0]).toEqual({ score: { cp: 30 }, best: 'e2e4', pv: ['e2e4'], second: { cp: 30 }, legalMoves: 20 })
    expect(review.positions[7]).toEqual({ score: { cp: MATED_CP }, best: null, pv: [], second: null, legalMoves: 0 })
    expect(review.labels[0]).toBeNull()
    expect(review.labels[1]).toBe('best') // e4
    expect(review.labels[6]).toBe('blunder') // 3...Nf6??
    expect(review.labels[7]).toBe('best') // Qxf7#
    expect(countJudgments(review.labels, 'w').black.blunder).toBe(1)
  })

  it('중간에 abort하면 AbortError', async () => {
    const ac = new AbortController()
    const engine = fakeEngine((n) => n === 3 && ac.abort())
    await expect(reviewGame(engine, SCHOLAR, { signal: ac.signal })).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('엔진이 cancelled를 돌려주면 AbortError', async () => {
    const engine = { analyze: vi.fn(async (): Promise<SearchResult> => ({ cancelled: true, bestMove: null, lines: [] })) }
    await expect(reviewGame(engine, SCHOLAR)).rejects.toMatchObject({ name: 'AbortError' })
  })
})

describe('buildReview 판정 연결', () => {
  it('오페라 게임 16.Qb8+는 탁월', () => {
    const plies = pgnToPlies(getClassic('opera-game')!.pgn)
    // 모든 수를 최선으로, 점수는 모두 +1.00. 16.Qb8+ 이후 포지션의 PV만 실제 수순(Nxb8 Rd8#)
    const positions: ReviewedPosition[] = plies.map((_, i) => ({
      score: { cp: 100 },
      best: plies[i + 1]?.uci ?? null,
      pv: i === 31 ? ['d7b8', 'd1d8'] : [],
      second: null,
      legalMoves: 20,
    }))
    const review = buildReview(plies, positions, 14)
    expect(plies[31].san).toBe('Qb8+')
    expect(review.labels[31]).toBe('brilliant')
    expect(review.labels[30]).toBe('best')
  })

  it('놓침은 직전 판정을 참조한다', () => {
    const plies = pgnToPlies('1. e4 e5 2. Nf3 *')
    const positions: ReviewedPosition[] = [
      { score: { cp: 0 }, best: 'e2e4', pv: [], second: null, legalMoves: 20 },
      { score: { cp: 0 }, best: 'd7d5', pv: [], second: null, legalMoves: 20 }, // e5 대신 d5가 최선
      { score: { cp: 300 }, best: 'd2d4', pv: [], second: null, legalMoves: 29 }, // e5는 블런더(흑 기준 −25%p)
      { score: { cp: 100 }, best: null, pv: [], second: null, legalMoves: 20 }, // Nf3로 +3.00 → +1.00, 백 손실 ≥ 10%p
    ]
    const review = buildReview(plies, positions, 14)
    expect(review.labels[2]).toBe('blunder')
    expect(review.labels[3]).toBe('miss')
  })

  it('메이트 수가 엔진 1순위와 달라도 최선급, 정확도 감점 없음', () => {
    const plies = pgnToPlies('1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0')
    const positions: ReviewedPosition[] = plies.map((_, i) => ({
      score: i === 6 ? { mate: 1 } : i === 7 ? { cp: MATED_CP } : { cp: 0 },
      best: i === 6 ? 'f1f1' : (plies[i + 1]?.uci ?? null), // 엔진이 다른 메이트 수를 고른 셈
      pv: [],
      second: null,
      legalMoves: i === 7 ? 0 : 20,
    }))
    const review = buildReview(plies, positions, 14)
    expect(['best', 'excellent']).toContain(review.labels[7])
    expect(review.accuracy.white).toBe(100)
  })

  it('동등한 포지션에서 강제 되잡기는 좋은 수가 아니라 최선', () => {
    const plies = pgnToPlies('1. e4 d5 2. exd5 Qxd5 *')
    const positions: ReviewedPosition[] = plies.map((_, i) => ({
      score: { cp: 0 },
      best: plies[i + 1]?.uci ?? null,
      pv: [],
      second: i === 3 ? { cp: 400 } : null, // 되잡지 않으면 흑이 크게 불리
      legalMoves: 20,
    }))
    const review = buildReview(plies, positions, 14)
    expect(plies[4].san).toBe('Qxd5')
    expect(review.labels[4]).toBe('best')
  })

  it('되잡기가 아닌 유일한 수는 여전히 좋은 수', () => {
    const plies = pgnToPlies('1. e4 d5 2. exd5 Nf6 *')
    const positions: ReviewedPosition[] = plies.map((_, i) => ({
      score: { cp: 0 },
      best: plies[i + 1]?.uci ?? null,
      pv: [],
      second: i === 3 ? { cp: 400 } : null,
      legalMoves: 20,
    }))
    expect(buildReview(plies, positions, 14).labels[4]).toBe('great')
  })
})

describe('analyzePosition', () => {
  it('MultiPV 2 결과를 ReviewedPosition으로 만든다', async () => {
    const engine = fakeEngine()
    expect(await analyzePosition(engine, SCHOLAR[0].fen, { depth: 12 })).toEqual({
      score: { cp: 30 },
      best: 'e2e4',
      pv: ['e2e4'],
      second: { cp: 30 },
      legalMoves: 20,
    })
    expect(engine.analyze).toHaveBeenCalledWith(SCHOLAR[0].fen, expect.objectContaining({ depth: 12, multiPv: 2 }))
  })

  it('끝난 포지션은 엔진 없이 점수를 매긴다', async () => {
    const engine = fakeEngine()
    expect(await analyzePosition(engine, SCHOLAR[7].fen)).toEqual({ score: { cp: MATED_CP }, best: null, pv: [], second: null, legalMoves: 0 })
    expect(engine.analyze).not.toHaveBeenCalled()
  })

  it('취소되면 null', async () => {
    const engine = { analyze: vi.fn(async (): Promise<SearchResult> => ({ cancelled: true, bestMove: null, lines: [] })) }
    expect(await analyzePosition(engine, SCHOLAR[0].fen)).toBeNull()
  })
})

describe('judgePly', () => {
  it('두 포지션만 있어도 buildReview와 같은 판정을 낸다', () => {
    const plies = pgnToPlies('1. e4 e5 2. Nf3 *')
    const positions: ReviewedPosition[] = [
      { score: { cp: 0 }, best: 'e2e4', pv: [], second: null, legalMoves: 20 },
      { score: { cp: 0 }, best: 'd7d5', pv: [], second: null, legalMoves: 20 },
      { score: { cp: 300 }, best: 'd2d4', pv: [], second: null, legalMoves: 29 },
      { score: { cp: 100 }, best: null, pv: [], second: null, legalMoves: 20 },
    ]
    const sparse: ReviewedPosition[] = []
    sparse[2] = positions[2]
    sparse[3] = positions[3]
    expect(judgePly(plies, sparse, 3, 'blunder')).toBe('miss')
    expect(judgePly(plies, sparse, 3, null)).toBe('blunder')
    expect(judgePly(plies, positions, 0, null)).toBeNull()
  })
})
