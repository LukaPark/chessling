import { describe, expect, it } from 'vitest'
import { moveNumberOf, moveTitle } from './moveNumber'
import { pgnToPlies } from './pgn'

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

describe('moveNumber', () => {
  it('백부터 시작', () => {
    expect(moveNumberOf(START, 1)).toEqual({ number: 1, white: true })
    expect(moveNumberOf(START, 2)).toEqual({ number: 1, white: false })
    expect(moveNumberOf(START, 3)).toEqual({ number: 2, white: true })
  })
  it('흑부터 시작', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 5'
    expect(moveNumberOf(fen, 1)).toEqual({ number: 5, white: false })
    expect(moveNumberOf(fen, 2)).toEqual({ number: 6, white: true })
  })
  it('moveTitle', () => {
    const plies = pgnToPlies('1. e4 e5 2. Nf3 *')
    expect(moveTitle(plies, 1)).toBe('1. e4')
    expect(moveTitle(plies, 2)).toBe('1... e5')
    expect(moveTitle(plies, 3)).toBe('2. Nf3')
  })
})
