import { QueryClient } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useMswServer } from '../test/msw'
import { chesscomMonthStaleTime, getGame } from './index'

const server = useMswServer()
const qc = () => new QueryClient({ defaultOptions: { queries: { retry: false } } })

function cc(uuid: string) {
  return {
    url: '',
    pgn: '1. e4 *',
    time_control: '60',
    end_time: 1788880073,
    uuid,
    time_class: 'bullet',
    rules: 'chess',
    white: { username: 'a', rating: 1, result: 'win' },
    black: { username: 'b', rating: 1, result: 'resigned' },
  }
}

describe('getGame', () => {
  it('classic', async () => {
    const g = await getGame({ kind: 'classic', slug: 'opera-game' }, qc())
    expect(g.white.name).toBe('Paul Morphy')
  })

  it('없는 classic은 not_found', async () => {
    await expect(getGame({ kind: 'classic', slug: 'nope' }, qc())).rejects.toMatchObject({ kind: 'not_found' })
  })

  it('같은 달의 Chess.com 대국은 아카이브를 한 번만 받는다', async () => {
    let calls = 0
    server.use(
      http.get('https://api.chess.com/pub/player/hikaru/games/2026/09', () => {
        calls++
        return HttpResponse.json({ games: [cc('u1'), cc('u2')] })
      }),
    )
    const client = qc()
    const a = await getGame({ kind: 'chesscom', user: 'hikaru', yyyy: '2026', mm: '09', uuid: 'u1' }, client)
    const b = await getGame({ kind: 'chesscom', user: 'hikaru', yyyy: '2026', mm: '09', uuid: 'u2' }, client)
    expect([a.ref, b.ref].map((r) => r.kind === 'chesscom' && r.uuid)).toEqual(['u1', 'u2'])
    expect(calls).toBe(1)
  })

  it('broadcast 라운드에서 gameId로 찾는다', async () => {
    server.use(
      http.get('https://lichess.org/api/broadcast/round/r1.pgn', () =>
        HttpResponse.text('[White "A"]\n[Black "B"]\n[Result "*"]\n[GameURL "https://lichess.org/broadcast/x/y/r1/g9"]\n\n1. e4 *\n'),
      ),
    )
    const g = await getGame({ kind: 'broadcast', roundId: 'r1', gameId: 'g9' }, qc())
    expect(g.white.name).toBe('A')
    await expect(getGame({ kind: 'broadcast', roundId: 'r1', gameId: 'zz' }, qc())).rejects.toMatchObject({ kind: 'not_found' })
  })

  it('lichess', async () => {
    server.use(
      http.get('https://lichess.org/game/export/abc', () =>
        HttpResponse.json({
          id: 'abc',
          variant: 'standard',
          speed: 'blitz',
          createdAt: 0,
          status: 'mate',
          winner: 'white',
          players: { white: { user: { name: 'w' } }, black: { user: { name: 'b' } } },
          pgn: '1. e4 *',
        }),
      ),
    )
    expect((await getGame({ kind: 'lichess', id: 'abc' }, qc())).pgn).toBe('1. e4 *')
  })
})

describe('chesscomMonthStaleTime', () => {
  const now = new Date('2026-09-30T12:00:00Z')
  it('지난 달은 무기한', () => {
    expect(chesscomMonthStaleTime('2026', '08', now)).toBe(Infinity)
    expect(chesscomMonthStaleTime('2025', '12', now)).toBe(Infinity)
  })
  it('이번 달과 미래는 60초', () => {
    expect(chesscomMonthStaleTime('2026', '09', now)).toBe(60_000)
    expect(chesscomMonthStaleTime('2026', '10', now)).toBe(60_000)
    expect(chesscomMonthStaleTime('2027', '01', now)).toBe(60_000)
  })
})

describe('getGame 지난 달 Chess.com 캐시', () => {
  afterEach(() => vi.useRealTimers())
  it('60초 넘게 지나도 지난 달 아카이브는 다시 받지 않는다', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-09-30T12:00:00Z') })
    let calls = 0
    server.use(
      http.get('https://api.chess.com/pub/player/hikaru/games/2026/08', () => {
        calls++
        return HttpResponse.json({ games: [cc('u1'), cc('u2')] })
      }),
    )
    const client = qc()
    await getGame({ kind: 'chesscom', user: 'hikaru', yyyy: '2026', mm: '08', uuid: 'u1' }, client)
    vi.setSystemTime(new Date('2026-09-30T12:05:00Z'))
    await getGame({ kind: 'chesscom', user: 'hikaru', yyyy: '2026', mm: '08', uuid: 'u2' }, client)
    expect(calls).toBe(1)
  })
})
