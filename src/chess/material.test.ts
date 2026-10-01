import { describe, expect, it } from 'vitest'
import { pgnToPlies } from './pgn'
import { getClassic } from '../sources/classics'
import { isSacrifice, materialBalance } from './material'

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const AFTER_E4_D5 = 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2'
const OPERA = pgnToPlies(getClassic('opera-game')!.pgn)

describe('materialBalance', () => {
  it('시작 포지션은 0', () => {
    expect(materialBalance(START, 'w')).toBe(0)
    expect(materialBalance(START, 'b')).toBe(0)
  })
  it('기준 편에서 본 차이', () => {
    const fen = '4k3/8/8/8/8/8/8/Q3K3 w - - 0 1'
    expect(materialBalance(fen, 'w')).toBe(9)
    expect(materialBalance(fen, 'b')).toBe(-9)
  })
})

describe('isSacrifice', () => {
  it('오페라 게임 16.Qb8+ 퀸 희생', () => {
    // plies[30] = 15...Nxd7 이후, 백 차례. 16.Qb8+ Nxb8 17.Rd8#
    expect(OPERA[31].san).toBe('Qb8+')
    expect(isSacrifice(OPERA[30].fen, 'b3b8', ['d7b8', 'd1d8'])).toBe(true)
  })
  it('같은 가치의 교환은 희생이 아니다', () => {
    expect(isSacrifice(AFTER_E4_D5, 'e4d5', ['d8d5'])).toBe(false)
  })
  it('PV가 없으면 둔 수만으로 판단한다', () => {
    expect(isSacrifice(START, 'e2e4', [])).toBe(false)
  })
  it('불법 수는 false, 불법 PV는 그 앞까지만', () => {
    expect(isSacrifice(START, 'e2e5', [])).toBe(false)
    expect(isSacrifice(START, 'e2e4', ['e2e4', 'd7d5'])).toBe(false)
  })
})
