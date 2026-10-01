// @vitest-environment jsdom
import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useMswServer } from '../../test/msw'
import { renderRoute } from '../../test/renderRoute'

const server = useMswServer()
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers() })

function cc(uuid: string, rules = 'chess') {
  return {
    url: '',
    pgn: '1. e4 *',
    time_control: '180',
    end_time: 1788880073,
    uuid,
    time_class: 'blitz',
    rules,
    white: { username: 'Hikaru', rating: 3370, result: 'win' },
    black: { username: `rival-${uuid}`, rating: 2700, result: 'resigned' },
  }
}

describe('PlayerPage', () => {
  it('Chess.com: 최신 달을 먼저 보여주고 이전 달로 이동한다', async () => {
    vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-09-15T00:00:00Z'))
    server.use(
      http.get('https://api.chess.com/pub/player/hikaru/games/archives', () =>
        HttpResponse.json({
          archives: ['https://api.chess.com/pub/player/hikaru/games/2026/08', 'https://api.chess.com/pub/player/hikaru/games/2026/09'],
        }),
      ),
      http.get('https://api.chess.com/pub/player/hikaru/games/2026/09', () => HttpResponse.json({ games: [cc('a'), cc('b', 'chess960')] })),
      http.get('https://api.chess.com/pub/player/hikaru/games/2026/08', () => HttpResponse.json({ games: [{ ...cc('c'), end_time: Date.UTC(2026, 7, 15) / 1000 }] })),
    )
    const user = userEvent.setup()
    renderRoute('/player/chesscom/Hikaru')
    expect(await screen.findByText('2026년 9월')).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: /rival-a/ })).toHaveAttribute('href', '/game/chesscom/hikaru/2026/09/a')
    expect(screen.getByText('지원하지 않음')).toBeInTheDocument()
    expect(screen.getAllByText('승리').length).toBeGreaterThan(0)
    expect(screen.queryByText(/월별 조회와 대국 날짜/)).toBeNull()
    expect(screen.queryByRole('link', { name: /rival-b/ })).toBeNull()
    await user.click(screen.getByRole('button', { name: '이전 달' }))
    expect(await screen.findByRole('link', { name: /rival-c/ })).toBeInTheDocument()
  })

  it('Lichess: 스트리밍으로 받은 대국 목록', async () => {
    const game = {
      id: 'aaaa1111',
      variant: 'standard',
      speed: 'blitz',
      createdAt: Date.UTC(2026, 8, 29),
      status: 'mate',
      winner: 'white',
      players: { white: { user: { name: 'tester' }, rating: 2000 }, black: { user: { name: 'rival' }, rating: 1990 } },
    }
    server.use(http.get('https://lichess.org/api/games/user/tester', () => new HttpResponse(JSON.stringify(game) + '\n')))
    renderRoute('/player/lichess/tester')
    expect(await screen.findByRole('link', { name: /tester.*vs.*rival/ })).toHaveAttribute('href', '/game/lichess/aaaa1111')
    expect(screen.queryByRole('button', { name: '더 보기' })).toBeNull()
  })

  it('없는 유저는 에러 화면', async () => {
    server.use(http.get('https://lichess.org/api/games/user/nobody', () => new HttpResponse(null, { status: 404 })))
    renderRoute('/player/lichess/nobody')
    expect(await screen.findByText(/찾을 수 없어요/)).toBeInTheDocument()
  })

  it('알 수 없는 플랫폼은 NotFound', async () => {
    renderRoute('/player/foo/bar')
    expect(await screen.findByRole('heading', { name: '페이지를 찾을 수 없어요' })).toBeInTheDocument()
  })
})
