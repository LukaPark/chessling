import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { useMswServer } from '../test/msw'
import { getBroadcastTour, getRoundGames, isHighlighted, listTopBroadcasts, searchBroadcasts, splitPgn } from './broadcast'

const server = useMswServer()

const OLYMPIAD = { id: 'oQuU2arG', name: '46th FIDE Chess Olympiad Samarkand 2026 | Women', slug: 'olympiad-women', dates: [1789553700000] }
const OTHER = { id: 'zzz', name: 'Local Open 2026', slug: 'local-open' }

const ROUND_PGN = `[Event "Olymp 2026 Women"]
[Date "2026.09.09"]
[White "Joku, Liberty"]
[Black "Rodriguez Guevara, Celia M."]
[Result "1/2-1/2"]
[WhiteElo "0"]
[BlackElo "1811"]
[BlackTitle "WCM"]
[Variant "Standard"]
[GameURL "https://lichess.org/broadcast/olympiad-women/round-11/zwtIOEd2/3YNrJV1C"]

1. e4 { [%eval 0.18] [%clk 1:30:47] } 1... c5 { [%eval 0.32] } 1/2-1/2


[Event "Olymp 2026 Women"]
[Date "2026.09.27"]
[White "A, B"]
[Black "C, D"]
[Result "*"]
[WhiteElo "2400"]
[GameURL "https://lichess.org/broadcast/olympiad-women/round-11/zwtIOEd2/XyZ12345"]

1. d4 d5 *
`

describe('splitPgn', () => {
  it('게임 단위로 나누되 헤더와 수순 사이의 빈 줄에서는 나누지 않는다', () => {
    const parts = splitPgn(ROUND_PGN)
    expect(parts).toHaveLength(2)
    expect(parts[0]).toContain('1. e4')
    expect(parts[1].startsWith('[Event')).toBe(true)
  })
})

describe('broadcast API', () => {
  it('top: active와 past의 tour만 꺼낸다', async () => {
    server.use(
      http.get('https://lichess.org/api/broadcast/top', () =>
        HttpResponse.json({ active: [{ tour: OLYMPIAD, round: {} }], upcoming: [], past: { currentPageResults: [{ tour: OTHER, round: {} }] } }),
      ),
    )
    expect(await listTopBroadcasts()).toEqual({ active: [OLYMPIAD], past: [OTHER] })
  })

  it('search', async () => {
    server.use(
      http.get('https://lichess.org/api/broadcast/search', ({ request }) => {
        expect(new URL(request.url).searchParams.get('q')).toBe('World Championship')
        return HttpResponse.json({ currentPageResults: [{ tour: OLYMPIAD }] })
      }),
    )
    expect(await searchBroadcasts('World Championship')).toEqual([OLYMPIAD])
  })

  it('tour 상세', async () => {
    const detail = { tour: OLYMPIAD, rounds: [{ id: 'r1', name: 'Round 1', finished: true }], defaultRoundId: 'r1' }
    server.use(http.get('https://lichess.org/api/broadcast/oQuU2arG', () => HttpResponse.json(detail)))
    expect(await getBroadcastTour('oQuU2arG')).toEqual(detail)
  })

  it('라운드 PGN을 GameRecord로 바꾼다', async () => {
    server.use(http.get('https://lichess.org/api/broadcast/round/zwtIOEd2.pgn', () => HttpResponse.text(ROUND_PGN)))
    const [g1, g2] = await getRoundGames('zwtIOEd2')
    expect(g1.ref).toEqual({ kind: 'broadcast', roundId: 'zwtIOEd2', gameId: '3YNrJV1C' })
    expect(g1).toMatchObject({
      white: { name: 'Joku, Liberty' },
      black: { name: 'Rodriguez Guevara, Celia M.', rating: 1811, title: 'WCM' },
      result: '1/2-1/2',
      date: '2026-09-09',
      variant: 'standard',
      event: 'Olymp 2026 Women',
    })
    expect(g1.white.rating).toBeUndefined()
    expect(g2).toMatchObject({ result: '*', ref: { gameId: 'XyZ12345' } })
  })
})

describe('isHighlighted', () => {
  it('올림피아드·월챔·캔디데이츠', () => {
    expect(isHighlighted(OLYMPIAD)).toBe(true)
    expect(isHighlighted({ ...OTHER, name: 'FIDE World Championship 2026' })).toBe(true)
    expect(isHighlighted({ ...OTHER, name: 'FIDE Candidates Tournament' })).toBe(true)
    expect(isHighlighted(OTHER)).toBe(false)
  })
})
