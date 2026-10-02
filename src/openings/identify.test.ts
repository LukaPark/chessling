import { describe, expect, it } from 'vitest'
import { pgnToPlies } from '../chess/pgn'
import { buildIndex } from './buildIndex'
import { identifyOpening } from './identify'
import type { OpeningData } from './types'

const NAJDORF = '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6'
const { entries } = buildIndex([
  { eco: 'B20', name: 'Sicilian Defense', pgn: '1. e4 c5' },
  { eco: 'B50', name: 'Sicilian Defense', pgn: '1. e4 c5 2. Nf3 d6' },
  { eco: 'B53', name: 'Sicilian Defense', pgn: '1. e4 c5 2. Nf3 d6 3. d4' },
  { eco: 'B90', name: 'Sicilian Defense: Najdorf Variation', pgn: NAJDORF },
  { eco: 'B90', name: 'Sicilian Defense: Najdorf Variation, English Attack', pgn: `${NAJDORF} 6. Be3` },
  { eco: 'B90', name: 'Sicilian Defense: Najdorf Variation, Adams Attack', pgn: `${NAJDORF} 6. h3` },
  { eco: 'A10', name: 'English Opening', pgn: '1. c4' },
  { eco: 'A13', name: 'English Opening: Agincourt Defense', pgn: '1. c4 e6' },
  { eco: 'E00', name: 'Indian Defense: Normal Variation', pgn: '1. d4 Nf6 2. c4 e6' },
])
const DATA: OpeningData = {
  index: entries,
  ko: {
    families: { 'Sicilian Defense': { name: '시실리안 디펜스', idea: 'i', plans: { white: 'w', black: 'b' } } },
    variations: { 'Sicilian Defense: Najdorf Variation': { name: '나이도르프 변화', summary: 's', line: NAJDORF } },
  },
}
const game = (moves: string) => pgnToPlies(`${moves} *`)

describe('identifyOpening', () => {
  it('수마다 마지막으로 맞은 오프닝을 이어 가고, 처음 맞은 수를 기억한다', () => {
    const t = identifyOpening(game('1. e4 c5 2. Nf3 d6 3. d4'), DATA)!
    expect(t.byPly[0]).toBeNull()
    expect(t.byPly[1]).toBeNull() // 1.e4는 이 색인에 없다
    expect(t.byPly[2]).toMatchObject({ ply: 2, entry: { eco: 'B20' } })
    expect(t.byPly[3]).toMatchObject({ ply: 2, entry: { eco: 'B20' } })
    // 2...d6(B50)도 이름이 같은 "Sicilian Defense"라 처음 맞은 수와 항목을 그대로 둔다
    expect(t.byPly[4]).toMatchObject({ ply: 2, entry: { eco: 'B20' }, family: { name: '시실리안 디펜스' }, variation: null })
  })

  it('이름이 같은 포지션이 이어지면 처음 맞은 수를 유지하고, 이탈 판정은 마지막으로 맞은 수를 따른다', () => {
    const t = identifyOpening(game('1. e4 c5 2. Nf3 d6 3. c3'), DATA)!
    expect(t.byPly[4]).toMatchObject({ ply: 2, entry: { name: 'Sicilian Defense' } })
    expect(t.byPly[5]).toMatchObject({ ply: 2 })
    // 마지막으로 맞은 수는 4(2...d6)라서 이탈은 5수째(3.c3)
    expect(t.deviation).toEqual({ ply: 5, theory: ['d2d4'] })
  })

  it('하위 변화는 가장 긴 접두어로 한국어 설명을 물려받는다', () => {
    const t = identifyOpening(game(`${NAJDORF} 6. Be3`), DATA)!
    expect(t.byPly[11]).toMatchObject({
      entry: { name: 'Sicilian Defense: Najdorf Variation, English Attack' },
      variation: { name: '나이도르프 변화' },
      variationKey: 'Sicilian Defense: Najdorf Variation',
    })
  })

  it('전치로 같은 포지션에 오면 같은 오프닝으로 본다', () => {
    const t = identifyOpening(game('1. c4 e6 2. d4 Nf6'), DATA)!
    expect(t.byPly[2]?.entry.name).toBe('English Opening: Agincourt Defense')
    expect(t.byPly[4]).toMatchObject({ ply: 4, entry: { name: 'Indian Defense: Normal Variation' } })
  })

  it('이론에서 벗어난 첫 수와 직전 포지션의 이론 수를 알려 준다', () => {
    const t = identifyOpening(game(`${NAJDORF} 6. f3`), DATA)!
    // 수순 길이가 같으면 이름순: Adams Attack(h3)이 English Attack(Be3)보다 앞
    expect(t.deviation).toEqual({ ply: 11, theory: ['h2h3', 'c1e3'] })
  })

  it('이론 끝까지 두었거나 이어 갈 이론이 없으면 이탈은 없다', () => {
    expect(identifyOpening(game(`${NAJDORF} 6. Be3`), DATA)!.deviation).toBeNull()
    expect(identifyOpening(game(`${NAJDORF} 6. Be3 e5`), DATA)!.deviation).toBeNull()
  })

  it('표준이 아닌 시작 포지션은 판별하지 않는다', () => {
    const plies = pgnToPlies('[SetUp "1"]\n[FEN "4k3/8/8/8/8/8/8/4K2R w K - 0 1"]\n\n1. O-O *')
    expect(identifyOpening(plies, DATA)).toBeNull()
  })
})
