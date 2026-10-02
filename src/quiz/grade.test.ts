import { describe, expect, it, vi } from 'vitest'
import { gradeMove } from './grade'
import { refutationText } from './refute'

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

describe('gradeMove', () => {
  const step = { answerUci: 'e2e4' }
  it('정답', async () => {
    expect(await gradeMove({ fen: START, uci: 'e2e4', step, side: 'w', evaluate: async () => ({ score: { cp: 0 }, best: null }) })).toEqual({ kind: 'correct' })
  })
  it('비슷하게 좋은 대안', async () => {
    const g = await gradeMove({ fen: START, uci: 'd2d4', step, side: 'w', evaluate: async () => ({ score: { cp: 30 }, best: null }) })
    expect(g.kind).toBe('alternative')
  })
  it('나쁜 수는 반박과 함께 오답', async () => {
    let n = 0
    const g = await gradeMove({
      fen: START,
      uci: 'f2f3',
      step,
      side: 'w',
      evaluate: async () => (n++ === 0 ? { score: { cp: -300 }, best: 'e7e5' } : { score: { cp: 40 }, best: null }),
    })
    expect(g).toEqual({ kind: 'wrong', refutation: refutationText('rnbqkbnr/pppppppp/8/8/8/5P2/PPPPP1PP/RNBQKBNR b KQkq - 0 1', 'e7e5') })
  })
  it('작성자 반박이 있으면 그것을 쓴다', async () => {
    const g = await gradeMove({
      fen: START,
      uci: 'g2g4',
      step: { answerUci: 'e2e4', refutations: [{ uci: 'g2g4', text: '킹 앞이 비어요.' }] },
      side: 'w',
      evaluate: async () => ({ score: { cp: 0 }, best: null }),
    })
    expect(g).toEqual({ kind: 'wrong', refutation: '킹 앞이 비어요.' })
  })
  it('흑 차례는 흑 기준으로 비교한다', async () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'
    let n = 0
    // 사용자 수 뒤 +300(백 우세), 정답 뒤 0 → 흑에게 나쁜 수
    const g = await gradeMove({ fen, uci: 'f7f6', step: { answerUci: 'e7e5' }, side: 'b', evaluate: async () => (n++ === 0 ? { score: { cp: 300 }, best: null } : { score: { cp: 0 }, best: null }) })
    expect(g.kind).toBe('wrong')
  })
  it('다른 체크메이트도 대안으로 인정하고 엔진을 부르지 않는다', async () => {
    // 정답(Qxh7+)과 다른 수(Qg7#)로 메이트해도 맞힌 셈이다
    const fen = '6k1/5p1p/5PpQ/8/8/8/8/6K1 w - - 0 1'
    const evaluate = vi.fn(async () => ({ score: { cp: 0 }, best: null }))
    const g = await gradeMove({ fen, uci: 'h6g7', step: { answerUci: 'h6h7' }, side: 'w', evaluate })
    expect(g.kind).toBe('alternative')
    expect(evaluate).not.toHaveBeenCalled()
  })
  it('둘 수 없는 수는 반박 없이 오답', async () => {
    expect(await gradeMove({ fen: START, uci: 'e2e5', step, side: 'w', evaluate: async () => ({ score: { cp: 0 }, best: null }) })).toEqual({ kind: 'wrong', refutation: null })
  })
})

describe('refutationText', () => {
  it('기물을 잃는 응수', () => {
    // 1.e4 d5 2.Qg4?? 뒤 Bxg4
    expect(refutationText('rnbqkbnr/ppp1pppp/8/3p4/4P1Q1/8/PPPP1PPP/RNB1KBNR b KQkq - 1 2', 'c8g4')).toBe('Bxg4가 나오면 퀸을 잃어요.')
  })
  it('으로/로를 받침에 맞춘다', () => {
    // 6(육)은 받침이 있어 "으로"
    const t = refutationText('rnbqkbnr/pppppppp/8/8/8/5P2/PPPPP1PP/RNBQKBNR b KQkq - 0 1', 'e7e6')
    expect(t).toBe('e6으로 받아치면 이점이 사라져요.')
  })
  it('메이트', () => {
    // 1.f3 e5 2.g4 Qh4#
    expect(refutationText('rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2', 'd8h4')).toBe('Qh4#로 바로 메이트당해요.')
  })
})
