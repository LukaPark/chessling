import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { useMswServer } from '../test/msw'
import { fetchChesscomMonth, fetchChesscomKoreanMonth, koreanArchiveMonths, findInMonth, listArchives, type ChesscomGameJson } from './chesscom'
import { HttpError } from './http'

const server = useMswServer()

function game(over: Partial<ChesscomGameJson>): ChesscomGameJson {
  return {
    url: 'https://www.chess.com/game/live/1',
    pgn: '[Event "Live Chess"]\n\n1. e4 e5 *',
    time_control: '180+2',
    end_time: Date.UTC(2026, 8, 8, 10) / 1000,
    uuid: 'uuid-1',
    time_class: 'blitz',
    rules: 'chess',
    white: { username: 'Hikaru', rating: 3370, result: 'win' },
    black: { username: 'rival', rating: 2700, result: 'resigned' },
    ...over,
  }
}

describe('listArchives', () => {
  it('아카이브 URL을 연·월로 바꾼다', async () => {
    server.use(
      http.get('https://api.chess.com/pub/player/hikaru/games/archives', () =>
        HttpResponse.json({
          archives: [
            'https://api.chess.com/pub/player/hikaru/games/2026/08',
            'https://api.chess.com/pub/player/hikaru/games/2026/09',
          ],
        }),
      ),
    )
    expect(await listArchives('Hikaru')).toEqual([
      { yyyy: '2026', mm: '08' },
      { yyyy: '2026', mm: '09' },
    ])
  })
})

describe('fetchChesscomMonth', () => {
  it('UTC 9월 말에 시작한 경기를 한국시간 10월 1일로 표시한다', async () => {
    server.use(http.get('https://api.chess.com/pub/player/hikaru/games/2026/09', () => HttpResponse.json({ games: [game({ pgn: '[UTCDate "2026.09.30"]\n[UTCTime "16:00:00"]\n\n1. e4 *' })] })))
    const record = (await fetchChesscomMonth('hikaru', '2026', '09'))[0]
    expect(record.date).toBe('2026-10-01')
    expect(record.ref).toMatchObject({ yyyy: '2026', mm: '09' })
  })

  it('월을 넘겨 종료한 경기는 PGN의 UTC 시작일을 표시한다', async () => {
    server.use(http.get('https://api.chess.com/pub/player/hikaru/games/2026/09', () => HttpResponse.json({ games: [game({ pgn: '[UTCDate "2026.09.30"]\n\n1. e4 *', end_time: Date.UTC(2026, 9, 1) / 1000 })] })))
    expect((await fetchChesscomMonth('hikaru', '2026', '09'))[0].date).toBe('2026-09-30')
  })

  it('최신 대국부터, 결과·변형·시간 제한을 매핑한다', async () => {
    server.use(
      http.get('https://api.chess.com/pub/player/hikaru/games/2026/09', () =>
        HttpResponse.json({
          games: [
            game({ uuid: 'old' }),
            game({
              uuid: 'new',
              rules: 'chess960',
              time_class: 'rapid',
              white: { username: 'rival', rating: 2700, result: 'agreed' },
              black: { username: 'Hikaru', rating: 3370, result: 'agreed' },
            }),
          ],
        }),
      ),
    )
    const games = await fetchChesscomMonth('Hikaru', '2026', '09')
    expect(games.map((g) => g.ref)).toEqual([
      { kind: 'chesscom', user: 'hikaru', yyyy: '2026', mm: '09', uuid: 'new' },
      { kind: 'chesscom', user: 'hikaru', yyyy: '2026', mm: '09', uuid: 'old' },
    ])
    expect(games[0]).toMatchObject({ result: '1/2-1/2', variant: 'other', speed: 'rapid' })
    expect(games[1]).toMatchObject({
      result: '1-0',
      variant: 'standard',
      speed: 'blitz',
      timeControl: '180+2',
      date: '2026-09-08',
      white: { name: 'Hikaru', rating: 3370 },
    })
    expect(games[1].pgn).toContain('1. e4')
  })

  it('흑 승리와 미종료', async () => {
    server.use(
      http.get('https://api.chess.com/pub/player/hikaru/games/2026/07', () =>
        HttpResponse.json({
          games: [
            game({ uuid: 'b', white: { username: 'a', rating: 1, result: 'checkmated' }, black: { username: 'b', rating: 1, result: 'win' } }),
            game({ uuid: 'c', white: { username: 'a', rating: 1, result: 'abandoned' }, black: { username: 'b', rating: 1, result: 'abandoned' } }),
          ],
        }),
      ),
    )
    const [c, b] = await fetchChesscomMonth('hikaru', '2026', '07')
    expect(b.result).toBe('0-1')
    expect(c.result).toBe('*')
  })

  it('없는 유저는 not_found', async () => {
    server.use(http.get('https://api.chess.com/pub/player/nobody/games/2026/09', () => new HttpResponse(null, { status: 404 })))
    await expect(fetchChesscomMonth('nobody', '2026', '09')).rejects.toMatchObject({ kind: 'not_found' })
  })
})

describe('findInMonth', () => {
  it('uuid로 찾고 없으면 not_found', async () => {
    server.use(
      http.get('https://api.chess.com/pub/player/hikaru/games/2026/09', () => HttpResponse.json({ games: [game({ uuid: 'x' })] })),
    )
    const games = await fetchChesscomMonth('hikaru', '2026', '09')
    expect(findInMonth(games, 'x').ref).toMatchObject({ uuid: 'x' })
    expect(() => findInMonth(games, 'y')).toThrow(HttpError)
  })
})

describe('한국시간 월별 조회', () => {
  it('9월 아카이브의 KST 10월 경기를 10월 목록에 포함하고 원본 링크를 유지한다', async () => {
    server.use(http.get('https://api.chess.com/pub/player/hikaru/games/2026/09', () => HttpResponse.json({ games: [game({ uuid: 'oct', pgn: '[UTCDate "2026.09.30"]\n[UTCTime "16:00:00"]\n\n1. e4 *' }), game({ uuid: 'sep' })] })))
    const archives = [{ yyyy: '2026', mm: '09' }]
    expect(koreanArchiveMonths(archives, new Date('2026-10-01T00:00:00Z'))).toEqual([...archives, { yyyy: '2026', mm: '10' }])
    const games = await fetchChesscomKoreanMonth('hikaru', '2026', '10', archives)
    expect(games).toHaveLength(1)
    expect(games[0].ref).toMatchObject({ uuid: 'oct', mm: '09' })
    expect((await fetchChesscomKoreanMonth('hikaru', '2026', '09', archives)).map(g => g.ref.kind === 'chesscom' && g.ref.uuid)).toEqual(['sep'])
  })
})
