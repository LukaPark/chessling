import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { useMswServer } from '../test/msw'
import { HttpError } from './http'
import { getLichessGame, listLichessGames, type LichessGameJson } from './lichess'

const server = useMswServer()

const G1: LichessGameJson = {
  id: 'aaaa1111',
  variant: 'standard',
  speed: 'blitz',
  createdAt: Date.UTC(2026, 8, 29, 12),
  status: 'mate',
  players: { white: { user: { name: 'tester', title: 'FM' }, rating: 2300 }, black: { user: { name: 'rival' }, rating: 2250 } },
  winner: 'white',
  clock: { initial: 180, increment: 2 },
}
const G2: LichessGameJson = {
  id: 'bbbb2222',
  variant: 'chess960',
  speed: 'rapid',
  createdAt: Date.UTC(2026, 8, 28, 12),
  status: 'draw',
  players: { white: { user: { name: 'rival' }, rating: 2240 }, black: { user: { name: 'tester' }, rating: 2310 } },
}
const G3: LichessGameJson = {
  id: 'cccc3333',
  variant: 'standard',
  speed: 'correspondence',
  createdAt: Date.UTC(2026, 8, 27, 12),
  status: 'resign',
  players: { white: { user: { name: 'tester' }, rating: 2300 }, black: { aiLevel: 8 } },
  winner: 'black',
}
const ndjson = (games: LichessGameJson[]) => games.map((g) => JSON.stringify(g)).join('\n') + '\n'

describe('listLichessGames', () => {
  it('NDJSON을 GameSummary로 바꾼다', async () => {
    let accept: string | null = null
    server.use(
      http.get('https://lichess.org/api/games/user/tester', ({ request }) => {
        accept = request.headers.get('accept')
        return new HttpResponse(ndjson([G1, G2, G3]), { headers: { 'Content-Type': 'application/x-ndjson' } })
      }),
    )
    const onGame = vi.fn()
    const page = await listLichessGames('tester', { onGame })
    expect(accept).toBe('application/x-ndjson')
    expect(onGame).toHaveBeenCalledTimes(3)
    expect(page.nextUntil).toBeNull()
    expect(page.games[0]).toEqual({
      ref: { kind: 'lichess', id: 'aaaa1111' },
      white: { name: 'tester', rating: 2300, title: 'FM' },
      black: { name: 'rival', rating: 2250 },
      result: '1-0',
      date: '2026-09-29',
      speed: 'blitz',
      timeControl: '3+2',
      variant: 'standard',
    })
    expect(page.games[1]).toMatchObject({ result: '1/2-1/2', variant: 'other', speed: 'rapid' })
    expect(page.games[2]).toMatchObject({ result: '0-1', black: { name: 'Stockfish level 8' }, speed: 'correspondence' })
  })

  it('max만큼 받으면 다음 페이지 until을 준다', async () => {
    let query = null as URLSearchParams | null
    server.use(
      http.get('https://lichess.org/api/games/user/tester', ({ request }) => {
        query = new URL(request.url).searchParams
        return new HttpResponse(ndjson([G1, G2]))
      }),
    )
    const page = await listLichessGames('tester', { max: 2, until: 999 })
    expect(query!.get('max')).toBe('2')
    expect(query!.get('until')).toBe('999')
    expect(page.nextUntil).toBe(G2.createdAt - 1)
  })

  it('404 / 429 / 네트워크 오류를 HttpError로 구분한다', async () => {
    server.use(http.get('https://lichess.org/api/games/user/nobody', () => new HttpResponse(null, { status: 404 })))
    await expect(listLichessGames('nobody')).rejects.toMatchObject({ kind: 'not_found', status: 404 })

    server.use(http.get('https://lichess.org/api/games/user/busy', () => new HttpResponse(null, { status: 429 })))
    await expect(listLichessGames('busy')).rejects.toMatchObject({ kind: 'rate_limited' })

    server.use(http.get('https://lichess.org/api/games/user/down', () => HttpResponse.error()))
    const err = await listLichessGames('down').catch((e) => e)
    expect(err).toBeInstanceOf(HttpError)
    expect(err.kind).toBe('network')
  })
})

describe('getLichessGame', () => {
  it('PGN을 포함한 GameRecord', async () => {
    server.use(
      http.get('https://lichess.org/game/export/aaaa1111', ({ request }) => {
        expect(new URL(request.url).searchParams.get('pgnInJson')).toBe('true')
        return HttpResponse.json({ ...G1, pgn: '[Event "x"]\n\n1. e4 *' })
      }),
    )
    const g = await getLichessGame('aaaa1111')
    expect(g.pgn).toContain('1. e4')
    expect(g.ref).toEqual({ kind: 'lichess', id: 'aaaa1111' })
  })
})
