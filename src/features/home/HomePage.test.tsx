// @vitest-environment jsdom
import { cleanup, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { addRecentPlayer, resetRecentPlayersForTest } from '../../app/recentPlayers'
import { todaysClassic } from '../../sources/classics'
import { useMswServer } from '../../test/msw'
import { renderRoute } from '../../test/renderRoute'

const server = useMswServer()
const TOP_EMPTY = { active: [], upcoming: [], past: { currentPageResults: [] } }
beforeEach(() => {
  localStorage.clear()
  resetRecentPlayersForTest()
  server.use(http.get('https://lichess.org/api/broadcast/top', () => HttpResponse.json(TOP_EMPTY)))
})
afterEach(cleanup)

describe('HomePage', () => {
  it('히어로 제목', () => {
    renderRoute('/')
    expect(screen.getByRole('heading', { level: 1, name: '역사적인 대국에 직접 참여하세요.' })).toBeInTheDocument()
  })

  it('플랫폼과 아이디로 플레이어 페이지로 이동한다', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute('/')
    await user.click(screen.getByLabelText('Lichess'))
    await user.type(screen.getByLabelText('아이디'), '  DrNykterstein ')
    await user.click(screen.getByRole('button', { name: '불러오기' }))
    expect(router.state.location.pathname).toBe('/player/lichess/DrNykterstein')
  })

  it('빈 아이디는 이동하지 않는다', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute('/')
    await user.click(screen.getByRole('button', { name: '불러오기' }))
    expect(router.state.location.pathname).toBe('/')
  })

  it('오늘의 명경기 링크와 자동 재생 조작', () => {
    renderRoute('/')
    const today = todaysClassic()
    expect(screen.getByRole('link', { name: today.title })).toHaveAttribute('href', `/game/classic/${today.slug}`)
    expect(screen.getByRole('link', { name: '오늘의 명경기 보기' })).toHaveAttribute('href', `/game/classic/${today.slug}`)
    const figure = screen.getByRole('figure', { name: '오늘의 명경기 자동 재생' })
    expect(figure).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '재생' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '이 대국 분석하기' })).toHaveAttribute('href', `/game/classic/${today.slug}`)
  })

  it('진행 중인 대회가 없으면 섹션을 숨긴다', async () => {
    renderRoute('/')
    await new Promise((r) => setTimeout(r, 20))
    expect(screen.queryByRole('heading', { name: '진행 중인 대회' })).toBeNull()
  })

  it('진행 중인 대회가 있으면 보여준다', async () => {
    server.use(
      http.get('https://lichess.org/api/broadcast/top', () =>
        HttpResponse.json({ ...TOP_EMPTY, active: [{ tour: { id: 'A', name: '46th FIDE Chess Olympiad', slug: 'o' } }] }),
      ),
    )
    renderRoute('/')
    expect(await screen.findByRole('link', { name: '46th FIDE Chess Olympiad' })).toHaveAttribute('href', '/events/A')
  })

  it('메모리 저장소면 저장되지 않는다는 배너', () => {
    renderRoute('/')
    expect(screen.getByText(/저장되지 않아요/)).toBeInTheDocument()
  })

  it('최근 검색이 없으면 그룹을 숨긴다', () => {
    renderRoute('/')
    expect(screen.queryByRole('group', { name: '최근 검색' })).toBeNull()
  })

  it('최근 검색 계정을 칩으로 보여주고 플레이어 페이지로 연결한다', () => {
    addRecentPlayer({ platform: 'chesscom', username: 'hikaru' })
    addRecentPlayer({ platform: 'lichess', username: 'Dr Nykterstein' })
    renderRoute('/')
    const group = screen.getByRole('group', { name: '최근 검색' })
    const links = within(group).getAllByRole('link')
    expect(links.map((a) => a.textContent)).toEqual(['Lichess · Dr Nykterstein', 'Chess.com · hikaru'])
    expect(links[0]).toHaveAttribute('href', '/player/lichess/Dr%20Nykterstein')
    expect(links[1]).toHaveAttribute('href', '/player/chesscom/hikaru')
  })

  it('× 버튼으로 최근 검색에서 지운다', async () => {
    const user = userEvent.setup()
    addRecentPlayer({ platform: 'chesscom', username: 'hikaru' })
    addRecentPlayer({ platform: 'lichess', username: 'tester' })
    renderRoute('/')
    await user.click(screen.getByRole('button', { name: 'tester 최근 검색에서 지우기' }))
    const group = screen.getByRole('group', { name: '최근 검색' })
    expect(within(group).getAllByRole('link').map((a) => a.textContent)).toEqual(['Chess.com · hikaru'])
    await user.click(screen.getByRole('button', { name: 'hikaru 최근 검색에서 지우기' }))
    expect(screen.queryByRole('group', { name: '최근 검색' })).toBeNull()
  })

  it('칩을 지우면 다음 칩, 없으면 이전 칩, 그것도 없으면 아이디 입력란으로 포커스를 옮긴다', async () => {
    const user = userEvent.setup()
    for (const u of ['c', 'b', 'a']) addRecentPlayer({ platform: 'lichess', username: u })
    renderRoute('/')
    await user.click(screen.getByRole('button', { name: 'b 최근 검색에서 지우기' }))
    expect(screen.getByRole('link', { name: 'Lichess · c' })).toHaveFocus()
    await user.click(screen.getByRole('button', { name: 'c 최근 검색에서 지우기' }))
    expect(screen.getByRole('link', { name: 'Lichess · a' })).toHaveFocus()
    await user.click(screen.getByRole('button', { name: 'a 최근 검색에서 지우기' }))
    expect(screen.getByLabelText('아이디')).toHaveFocus()
  })
})
