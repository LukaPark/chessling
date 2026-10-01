// @vitest-environment jsdom
import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, expect, it } from 'vitest'
import { useMswServer } from '../../test/msw'
import { renderRoute } from '../../test/renderRoute'

const server = useMswServer()
afterEach(cleanup)

it('추천 목록과 빠른 검색', async () => {
  server.use(
    http.get('https://lichess.org/api/broadcast/top', () =>
      HttpResponse.json({
        active: [{ tour: { id: 'A', name: '46th FIDE Chess Olympiad', slug: 'o' } }],
        upcoming: [],
        past: { currentPageResults: [{ tour: { id: 'P', name: 'Local Open', slug: 'l' } }] },
      }),
    ),
    http.get('https://lichess.org/api/broadcast/search', () =>
      HttpResponse.json({ currentPageResults: [{ tour: { id: 'W', name: 'FIDE World Championship 2024', slug: 'w' } }] }),
    ),
  )
  const user = userEvent.setup()
  renderRoute('/events')
  const olympiad = await screen.findByRole('link', { name: '46th FIDE Chess Olympiad' })
  expect(olympiad).toHaveAttribute('href', '/events/A')
  expect(olympiad.closest('li')).toHaveAttribute('data-highlight', 'true')
  expect(screen.getByRole('link', { name: 'Local Open' })).toBeInTheDocument()
  await user.click(screen.getByLabelText('월드챔피언십'))
  expect(await screen.findByRole('link', { name: 'FIDE World Championship 2024' })).toHaveAttribute('href', '/events/W')
})
