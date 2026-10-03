import { describe, expect, it } from 'vitest'
import { buildIndex } from './buildIndex'
import { epdOf, sanLineToUci } from './line'

describe('buildIndex', () => {
  it('수순을 UCI와 최종 포지션 EPD로 바꾼다', () => {
    const { entries } = buildIndex([{ eco: 'B20', name: 'Sicilian Defense', pgn: '1. e4 c5' }])
    expect(entries).toEqual([
      { eco: 'B20', name: 'Sicilian Defense', uci: ['e2e4', 'c7c5'], epd: epdOf(sanLineToUci('1. e4 c5').fens[1]) },
    ])
  })

  it('같은 포지션이면 수순이 긴 이름을 남기고 충돌을 알린다', () => {
    const { entries, conflicts } = buildIndex([
      { eco: 'A', name: 'Short', pgn: '1. d4 Nf6 2. c4 e6' },
      { eco: 'B', name: 'Long', pgn: '1. Nf3 Nf6 2. d4 e6 3. c4' },
      { eco: 'C', name: 'Other', pgn: '1. c4 e6 2. d4 Nf6' },
    ])
    // Short와 Other는 같은 포지션(전치), 수순 길이가 같으면 먼저 온 것을 남긴다
    expect(entries.map((e) => e.name)).toEqual(['Short', 'Long'])
    expect(conflicts).toEqual(['Other → Short'])
  })

  it('둘 수 없는 수순이 있으면 이름과 함께 실패한다', () => {
    expect(() => buildIndex([{ eco: 'X', name: 'Broken', pgn: '1. e5' }])).toThrow(/Broken/)
  })
})
