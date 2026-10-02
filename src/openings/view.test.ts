import { describe, expect, it } from 'vitest'
import { pgnToPlies } from '../chess/pgn'
import { buildIndex } from './buildIndex'
import { identifyOpening } from './identify'
import type { OpeningData } from './types'
import { cardOpening, compareLine, openingLabel, practiceLine } from './view'

const NAJDORF = '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6'
const { entries } = buildIndex([
  { eco: 'B20', name: 'Sicilian Defense', pgn: '1. e4 c5' },
  { eco: 'B90', name: 'Sicilian Defense: Najdorf Variation', pgn: NAJDORF },
  { eco: 'B90', name: 'Sicilian Defense: Najdorf Variation, English Attack', pgn: `${NAJDORF} 6. Be3` },
  { eco: 'C20', name: "King's Pawn Game", pgn: '1. e4 e5' },
])
const DATA: OpeningData = {
  index: entries,
  ko: {
    families: { 'Sicilian Defense': { name: '시실리안 디펜스', idea: '계열 아이디어예요.', plans: { white: 'w', black: 'b' } } },
    variations: { 'Sicilian Defense: Najdorf Variation': { name: '나이도르프 변화', summary: '변화 요약이에요.', line: NAJDORF } },
  },
}
const plies = pgnToPlies(`${NAJDORF} 6. f3 *`)
const track = identifyOpening(plies, DATA)!

describe('openingLabel', () => {
  it('한국어 계열·변화명 뒤에 원문 변화명을 붙인다', () => {
    expect(openingLabel(track.byPly[10]!)).toBe('B90 · 시실리안 디펜스: 나이도르프 변화 · Najdorf Variation')
    expect(openingLabel(track.byPly[2]!)).toBe('B20 · 시실리안 디펜스')
  })

  it('한국어 변화명이 없으면 계열명 뒤에 영어 변화명을, 계열도 없으면 원문 전체를 쓴다', () => {
    const t = identifyOpening(pgnToPlies(`${NAJDORF} 6. Be3 *`), DATA)!
    expect(openingLabel(t.byPly[11]!)).toBe('B90 · 시실리안 디펜스: 나이도르프 변화 · Najdorf Variation, English Attack')
    const k = identifyOpening(pgnToPlies('1. e4 e5 *'), DATA)!
    expect(openingLabel(k.byPly[2]!)).toBe("C20 · King's Pawn Game")
  })
})

describe('cardOpening', () => {
  it('이름이 바뀌는 수에서만 설명을 붙이고, 변화 설명이 없으면 계열 아이디어를 쓴다', () => {
    expect(cardOpening(track, plies, 0)).toBeNull()
    expect(cardOpening(track, plies, 2)).toMatchObject({ changed: true, summary: '계열 아이디어예요.' })
    expect(cardOpening(track, plies, 3)).toMatchObject({ changed: false, summary: null })
    expect(cardOpening(track, plies, 10)).toMatchObject({ changed: true, summary: '변화 요약이에요.' })
  })

  it('이탈 수에서 수 번호를 붙인 이론 수를 알려 준다', () => {
    expect(cardOpening(track, plies, 11)).toMatchObject({ changed: false, deviation: '이론대로라면 6.Be3' })
    expect(cardOpening(track, plies, 10)?.deviation).toBeNull()
  })
})

describe('practiceLine', () => {
  it('한국어 대표 수순이 있으면 그것을, 없으면 색인 수순을 쓴다', () => {
    const najdorf = practiceLine(track.byPly[10]!)
    expect(najdorf.san).toEqual(['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6'])
    expect(najdorf.endFen).toBe(plies[10].fen)
    const sicilian = practiceLine(track.byPly[2]!)
    expect(sicilian.uci).toEqual(['e2e4', 'c7c5'])
  })
})

describe('compareLine', () => {
  it('실제 대국과 같은 앞부분 수를 센다', () => {
    const line = practiceLine(track.byPly[10]!).uci
    expect(compareLine(line, plies)).toBe(10)
    expect(compareLine([...line, 'c1e3'], plies)).toBe(10)
    expect(compareLine(['d2d4'], plies)).toBe(0)
  })
})
