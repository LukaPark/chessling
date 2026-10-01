// @vitest-environment jsdom
import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, expect, it } from 'vitest'
import { useMswServer } from '../../test/msw'
import { renderRoute } from '../../test/renderRoute'

const server = useMswServer()
afterEach(cleanup)

const pgn = (white: string, black: string, result: string, roundId: string, gameId: string) =>
  `[White "${white}"]\n[Black "${black}"]\n[Result "${result}"]\n[GameURL "https://lichess.org/broadcast/wch/r/${roundId}/${gameId}"]\n\n1. d4 d5 ${result}\n`

it('기본 라운드의 대국을 보여주고 라운드를 바꿀 수 있다', async () => {
  server.use(
    http.get('https://lichess.org/api/broadcast/T1', () =>
      HttpResponse.json({
        tour: { id: 'T1', name: 'FIDE World Championship 2026', slug: 'wch' },
        rounds: [
          { id: 'r1', name: 'Game 1', finished: true },
          { id: 'r2', name: 'Game 2', ongoing: true },
        ],
        defaultRoundId: 'r2',
      }),
    ),
    http.get('https://lichess.org/api/broadcast/round/r2.pgn', () => HttpResponse.text(pgn('Gukesh', 'Ding', '*', 'r2', 'g2'))),
    http.get('https://lichess.org/api/broadcast/round/r1.pgn', () => HttpResponse.text(pgn('Ding', 'Gukesh', '1-0', 'r1', 'g1'))),
  )
  const user = userEvent.setup()
  renderRoute('/events/T1')
  expect(await screen.findByRole('heading', { name: 'FIDE World Championship 2026' })).toBeInTheDocument()
  expect(await screen.findByRole('link', { name: /Gukesh vs Ding/ })).toHaveAttribute('href', '/game/broadcast/r2/g2')
  expect(screen.getByText('진행 중', { selector: '[data-badge]' })).toBeInTheDocument()
  await user.selectOptions(screen.getByLabelText('라운드'), 'r1')
  expect(await screen.findByRole('link', { name: /Ding vs Gukesh/ })).toHaveAttribute('href', '/game/broadcast/r1/g1')
})

it('라운드가 없는 대회는 안내 문구를 보인다', async () => {
  server.use(
    http.get('https://lichess.org/api/broadcast/T2', () =>
      HttpResponse.json({ tour: { id: 'T2', name: 'Empty Tour', slug: 'empty' }, rounds: [] }),
    ),
  )
  renderRoute('/events/T2')
  expect(await screen.findByText('라운드가 없어요.')).toBeInTheDocument()
  expect(screen.queryByText('불러오는 중…')).toBeNull()
})
