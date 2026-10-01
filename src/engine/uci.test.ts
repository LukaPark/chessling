import { describe, expect, it } from 'vitest'
import { parseBestMove, parseInfo } from './uci'

describe('parseInfo', () => {
  it('cp 점수와 pv', () => {
    expect(parseInfo('info depth 12 seldepth 15 multipv 2 score cp -34 nodes 1000 nps 5000 pv e7e5 g1f3')).toEqual({
      depth: 12,
      multipv: 2,
      score: { cp: -34 },
      pv: ['e7e5', 'g1f3'],
    })
  })
  it('mate 점수, multipv 생략 시 1', () => {
    expect(parseInfo('info depth 8 seldepth 2 score mate 1 nodes 136 pv a1a8')).toEqual({
      depth: 8,
      multipv: 1,
      score: { mate: 1 },
      pv: ['a1a8'],
    })
  })
  it('bound, pv 없음, info string은 무시', () => {
    expect(parseInfo('info depth 5 multipv 1 score cp 10 lowerbound pv e2e4')).toBeNull()
    expect(parseInfo('info depth 5 multipv 1 score cp 10 upperbound pv e2e4')).toBeNull()
    expect(parseInfo('info depth 0 score mate 0')).toBeNull()
    expect(parseInfo('info string NNUE evaluation using nn.bin')).toBeNull()
    expect(parseInfo('readyok')).toBeNull()
  })
})

describe('parseBestMove', () => {
  it('bestmove 줄', () => {
    expect(parseBestMove('bestmove e2e4 ponder e7e5')).toBe('e2e4')
    expect(parseBestMove('bestmove (none)')).toBeNull()
    expect(parseBestMove('info depth 1')).toBeUndefined()
  })
})
