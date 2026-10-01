// @vitest-environment jsdom
import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { todaysClassic } from '../../sources/classics'
import { useMswServer } from '../../test/msw'
import { renderRoute } from '../../test/renderRoute'

const server = useMswServer()
const TOP_EMPTY = { active: [], upcoming: [], past: { currentPageResults: [] } }
beforeEach(() => server.use(http.get('https://lichess.org/api/broadcast/top', () => HttpResponse.json(TOP_EMPTY))))
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
})
