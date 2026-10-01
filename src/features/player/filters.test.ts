import { describe, expect, it } from 'vitest'
import type { GameSummary } from '../../chess/types'
import { DEFAULT_FILTER, filterGames, outcomeFor, userColor } from './filters'

function g(id: string, white: string, black: string, result: GameSummary['result'], speed: GameSummary['speed'] = 'blitz'): GameSummary {
  return { ref: { kind: 'lichess', id }, white: { name: white }, black: { name: black }, result, date: '2026-09-01', speed, variant: 'standard' }
}

const games = [
  g('1', 'Tester', 'a', '1-0'),
  g('2', 'b', 'tester', '1-0', 'rapid'),
  g('3', 'tester', 'c', '1/2-1/2'),
  g('4', 'd', 'Tester', '0-1', 'bullet'),
  g('5', 'tester', 'e', '*'),
]
const ids = (xs: GameSummary[]) => xs.map((x) => (x.ref.kind === 'lichess' ? x.ref.id : ''))

describe('filters', () => {
  it('userColor는 대소문자를 무시한다', () => {
    expect(userColor(games[0], 'tester')).toBe('white')
    expect(userColor(games[1], 'TESTER')).toBe('black')
    expect(userColor(games[0], 'nobody')).toBeNull()
  })
  it('outcomeFor', () => {
    expect(outcomeFor(games[0], 'white')).toBe('win')
    expect(outcomeFor(games[1], 'black')).toBe('loss')
    expect(outcomeFor(games[2], 'white')).toBe('draw')
    expect(outcomeFor(games[4], 'white')).toBeNull()
  })
  it('기본 필터는 전부', () => {
    expect(filterGames(games, 'tester', DEFAULT_FILTER)).toHaveLength(5)
  })
  it('결과·색·시간 제한 필터', () => {
    expect(ids(filterGames(games, 'tester', { ...DEFAULT_FILTER, result: 'win' }))).toEqual(['1', '4'])
    expect(ids(filterGames(games, 'tester', { ...DEFAULT_FILTER, result: 'loss' }))).toEqual(['2'])
    expect(ids(filterGames(games, 'tester', { ...DEFAULT_FILTER, color: 'black' }))).toEqual(['2', '4'])
    expect(ids(filterGames(games, 'tester', { ...DEFAULT_FILTER, speed: 'bullet' }))).toEqual(['4'])
  })
})
