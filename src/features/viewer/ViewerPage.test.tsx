// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FakeWorker } from '../../engine/testing/fakeWorker'
import { UciEngine } from '../../engine/UciEngine'
import { http, HttpResponse } from 'msw'
import { useMswServer } from '../../test/msw'
import { boardProps } from '../../test/boardMock'
import { renderRoute } from '../../test/renderRoute'

vi.mock('../../components/Board', () => import('../../test/boardMock'))
vi.mock('../../sources/annotations', () => ({
  annotationSlugs: () => ['opera-game'],
  loadAnnotations: async (slug: string) =>
    slug === 'opera-game'
      ? {
          slug,
          version: 1,
          scenes: [],
          plies: [
            { ply: 0, text: '파리 오페라 극장 귀빈석에서 둔 한 판이에요.' },
            { ply: 1, text: '중앙을 차지하며 시작해요.', key: true },
          ],
        }
      : null,
}))

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'

const server = useMswServer()
afterEach(cleanup)

function analysisEngine() {
  return new UciEngine(
    () => new FakeWorker({ info: () => ['info depth 18 multipv 1 score cp 25 pv e2e4 e7e5'], bestMove: () => 'e2e4' }),
  )
}

describe('ViewerPage', () => {
  it('명경기는 리뷰 전에도 해설과 핵심 장면 표시를 보여 준다', async () => {
    renderRoute('/game/classic/opera-game')
    const card = await screen.findByRole('region', { name: '이번 수 판정' })
    expect(await within(card).findByText('파리 오페라 극장 귀빈석에서 둔 한 판이에요.', {}, { timeout: 3000 })).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(await within(card).findByText('중앙을 차지하며 시작해요.', {}, { timeout: 3000 })).toBeInTheDocument()
    expect(within(card).getByText('핵심 장면')).toBeInTheDocument()
  })

  it('명경기를 불러와 키보드로 수를 넘기고 엔진 평가를 보여준다', async () => {
    renderRoute('/game/classic/opera-game', { engines: { analysis: analysisEngine() } })
    expect(await screen.findByRole('heading', { name: /Paul Morphy/ })).toBeInTheDocument()
    expect(screen.getByTestId('board')).toHaveAttribute('data-fen', START)
    expect((await screen.findAllByText('+0.25')).length).toBeGreaterThan(0)

    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(screen.getByTestId('board')).toHaveAttribute('data-fen', AFTER_E4)

    fireEvent.keyDown(window, { key: 'End' })
    fireEvent.click(screen.getByRole('button', { name: '기보 전체' }))
    expect(screen.getByRole('button', { name: 'Rd8#' })).toHaveAttribute('aria-current', 'step')

    fireEvent.keyDown(window, { key: 'Home' })
    expect(screen.getByTestId('board')).toHaveAttribute('data-fen', START)
  })

  it('기보의 수를 클릭하면 이동한다', async () => {
    renderRoute('/game/classic/opera-game')
    fireEvent.click(await screen.findByRole('button', { name: '기보 전체' }))
    fireEvent.click(screen.getByRole('button', { name: 'e4' }))
    expect(screen.getByTestId('board')).toHaveAttribute('data-fen', AFTER_E4)
  })

  it('없는 명경기는 찾을 수 없다는 에러', async () => {
    renderRoute('/game/classic/nope')
    expect(await screen.findByText(/찾을 수 없어요/)).toBeInTheDocument()
  })

  it('형식이 틀린 경로는 NotFound', async () => {
    renderRoute('/game/lichess')
    expect(await screen.findByRole('heading', { name: '페이지를 찾을 수 없어요' })).toBeInTheDocument()
  })

  it('리뷰를 실행하면 정확도와 평가 그래프가 보인다', async () => {
    renderRoute('/game/classic/opera-game', { engines: { analysis: analysisEngine() } })
    fireEvent.click(await screen.findByRole('button', { name: '리뷰 실행' }))
    expect(await screen.findByText(/백 정확도/)).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '평가 그래프' })).toBeInTheDocument()
  })

  it('해설이 없는 경기는 리뷰 뒤 생성 코멘트를 보여 준다', async () => {
    renderRoute('/game/classic/immortal-game', { engines: { analysis: analysisEngine() } })
    const card = await screen.findByRole('region', { name: '이번 수 판정' })
    fireEvent.click(within(card).getByRole('button', { name: '리뷰 실행' }))
    await screen.findByText(/백 정확도/)
    fireEvent.keyDown(window, { key: 'Home' })
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(within(card).getByText(/중앙|공간|가운데/)).toBeInTheDocument() // 1. e4
  })

  it('접이식 버튼에 포커스가 있어도 화살표 키로 이동한다', async () => {
    renderRoute('/game/classic/opera-game', { engines: { analysis: analysisEngine() } })
    const trigger = await screen.findByRole('button', { name: '엔진 라인' })
    trigger.focus()
    fireEvent.keyDown(trigger, { key: 'ArrowRight' })
    expect(screen.getByTestId('board')).toHaveAttribute('data-fen', AFTER_E4)
  })

  it('최선 수 화살표는 엔진 라인을 펼쳤을 때만 그린다', async () => {
    renderRoute('/game/classic/opera-game', { engines: { analysis: analysisEngine() } })
    expect((await screen.findAllByText('+0.25')).length).toBeGreaterThan(0)
    expect(boardProps.current?.shapes ?? []).toHaveLength(0)
    fireEvent.click(screen.getByRole('button', { name: '엔진 라인' }))
    await waitFor(() => expect(boardProps.current?.shapes).toHaveLength(1))
  })

  it('가운데 카운터로 기보 시트를 열고, 수를 고르면 닫힌다', async () => {
    renderRoute('/game/classic/opera-game')
    fireEvent.click(await screen.findByRole('button', { name: /기보 전체 보기/ }))
    const sheet = screen.getByRole('dialog', { name: '기보' })
    fireEvent.click(within(sheet).getByRole('button', { name: 'e4' }))
    expect(screen.queryByRole('dialog', { name: '기보' })).toBeNull()
    expect(screen.getByTestId('board')).toHaveAttribute('data-fen', AFTER_E4)
  })

  it('보드를 스와이프해 수를 넘긴다', async () => {
    renderRoute('/game/classic/opera-game')
    const area = await screen.findByTestId('board-swipe')
    fireEvent.touchStart(area, { touches: [{ clientX: 300, clientY: 100 }] })
    fireEvent.touchEnd(area, { changedTouches: [{ clientX: 200, clientY: 100 }] })
    expect(screen.getByTestId('board')).toHaveAttribute('data-fen', AFTER_E4)
  })

  it('첫 포지션에서는 처음·이전 수 버튼이 비활성', async () => {
    renderRoute('/game/classic/opera-game')
    expect(await screen.findByRole('button', { name: '처음' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '이전 수' })).toBeDisabled()
  })

  it('Alt 같은 보조키가 눌리면 이동하지 않는다', async () => {
    renderRoute('/game/classic/opera-game', { engines: { analysis: analysisEngine() } })
    await screen.findByRole('heading', { name: /Paul Morphy/ })
    fireEvent.keyDown(window, { key: 'ArrowRight', altKey: true })
    expect(screen.getByTestId('board')).toHaveAttribute('data-fen', START)
  })

  it('여기서 분기하면 분기 레코드를 만들고 대국 화면으로 이동한다', async () => {
    const { router, store } = renderRoute('/game/classic/opera-game')
    await screen.findByRole('heading', { name: /Paul Morphy/ })
    for (let i = 0; i < 4; i++) fireEvent.keyDown(window, { key: 'ArrowRight' })
    fireEvent.click(screen.getByRole('button', { name: '여기서 분기' }))
    const dialog = screen.getByRole('dialog', { name: '여기서 분기해서 두기' })
    fireEvent.click(within(dialog).getByRole('button', { name: '시작' }))
    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/play\//))
    const [fork] = await store.forks.list()
    expect(fork).toMatchObject({ originPly: 4, playerColor: 'white', engineElo: 1800, origin: { kind: 'classic', slug: 'opera-game' } })
  })

  it('분기 다이얼로그에서 Elo 슬라이더에 화살표 키를 눌러도 뷰어의 수는 바뀌지 않는다', async () => {
    const { router, store } = renderRoute('/game/classic/opera-game')
    await screen.findByRole('heading', { name: /Paul Morphy/ })
    for (let i = 0; i < 4; i++) fireEvent.keyDown(window, { key: 'ArrowRight' })
    fireEvent.click(screen.getByRole('button', { name: '여기서 분기' }))
    const dialog = screen.getByRole('dialog', { name: '여기서 분기해서 두기' })
    const slider = within(dialog).getByRole('slider')
    slider.focus()
    fireEvent.keyDown(slider, { key: 'ArrowRight' })
    fireEvent.keyDown(slider, { key: 'End' })
    fireEvent.click(within(dialog).getByRole('button', { name: '시작' }))
    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/play\//))
    const [fork] = await store.forks.list()
    expect(fork.originPly).toBe(4)
  })

  it('시작을 두 번 눌러도 분기는 하나만 만든다', async () => {
    const { router, store } = renderRoute('/game/classic/opera-game')
    await screen.findByRole('heading', { name: /Paul Morphy/ })
    fireEvent.click(screen.getByRole('button', { name: '여기서 분기' }))
    const start = within(screen.getByRole('dialog')).getByRole('button', { name: '시작' })
    fireEvent.click(start)
    fireEvent.click(start)
    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/play\//))
    expect(await store.forks.list()).toHaveLength(1)
  })

  it('분기 저장에 실패하면 경고를 보이고 다시 시도할 수 있다', async () => {
    const { store } = renderRoute('/game/classic/opera-game')
    vi.spyOn(store.forks, 'put').mockRejectedValueOnce(new Error('quota'))
    await screen.findByRole('heading', { name: /Paul Morphy/ })
    fireEvent.click(screen.getByRole('button', { name: '여기서 분기' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '시작' }))
    expect(await screen.findByText('분기를 저장하지 못했어요.')).toBeInTheDocument()
    expect(within(screen.getByRole('dialog')).getByRole('button', { name: '시작' })).toBeEnabled()
  })

  it('지원하지 않는 변형 체스는 뷰어 대신 안내만 보인다', async () => {
    server.use(
      http.get('https://lichess.org/game/export/c960', () =>
        HttpResponse.json({
          id: 'c960',
          variant: 'chess960',
          speed: 'blitz',
          createdAt: 0,
          status: 'mate',
          winner: 'white',
          players: { white: { user: { name: 'w' } }, black: { user: { name: 'b' } } },
          pgn: '1. e4 e5 *',
        }),
      ),
    )
    renderRoute('/game/lichess/c960')
    expect(await screen.findByText('지원하지 않는 변형 체스예요.')).toBeInTheDocument()
    expect(screen.queryByTestId('board')).toBeNull()
    expect(screen.queryByRole('button', { name: '여기서 분기' })).toBeNull()
  })

  it('리뷰가 끝나면 다시 실행 버튼으로 재분석할 수 있다', async () => {
    renderRoute('/game/classic/opera-game', { engines: { analysis: analysisEngine() } })
    fireEvent.click(await screen.findByRole('button', { name: '리뷰 실행' }))
    fireEvent.click(await screen.findByRole('button', { name: '리뷰 다시 실행' }))
    // 진행 표시는 잠깐만 떠 있으므로, 찾는 것만으로 나타났음을 확인한다(이후 분리될 수 있음)
    await screen.findByText(/분석 중/)
    expect(await screen.findByText(/백 정확도/)).toBeInTheDocument()
  })

  it('리뷰 전에는 판정 카드에 리뷰 안내가, 리뷰 후에는 판정이 보인다', async () => {
    renderRoute('/game/classic/opera-game', { engines: { analysis: analysisEngine() } })
    const card = await screen.findByRole('region', { name: '이번 수 판정' })
    expect(within(card).getByText('시작 포지션')).toBeInTheDocument()
    fireEvent.click(within(card).getByRole('button', { name: '리뷰 실행' }))
    expect(await screen.findByText(/백 정확도/)).toBeInTheDocument()
    expect(await within(card).findByText('17. Rd8#')).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'Home' })
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(within(card).getByText('1. e4')).toBeInTheDocument()
    expect(within(card).getByText('최선')).toBeInTheDocument()
    expect(within(card).getByText(/형세/)).toBeInTheDocument()
  })

  it('힌트는 기본으로 숨기고, 누르면 보이며, 수를 옮기면 다시 숨긴다', async () => {
    renderRoute('/game/classic/opera-game', { engines: { analysis: analysisEngine() } })
    const card = await screen.findByRole('region', { name: '이번 수 판정' })
    await screen.findAllByText('+0.25')
    expect(within(card).queryByText(/힌트:/)).toBeNull()
    const hint = screen.getByRole('button', { name: '힌트' })
    await waitFor(() => expect(hint).toBeEnabled())
    fireEvent.click(hint)
    expect(hint).toHaveAttribute('aria-pressed', 'true')
    expect(within(card).getByText('다음 수 힌트: e4')).toBeInTheDocument()
    expect(boardProps.current?.shapes).toHaveLength(1)
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(screen.getByRole('button', { name: '힌트' })).toHaveAttribute('aria-pressed', 'false')
    expect(within(card).queryByText(/힌트:/)).toBeNull()
  })

  it('리뷰 전에는 리뷰 안내 문구가, 진행 중에는 진행 막대가 보이고 수마다 알리지는 않는다', async () => {
    renderRoute('/game/classic/opera-game', { engines: { analysis: analysisEngine() } })
    const card = await screen.findByRole('region', { name: '이번 수 판정' })
    expect(within(card).getByText('리뷰를 실행하면 수마다 판정이 붙어요')).toBeInTheDocument()
    fireEvent.click(within(card).getByRole('button', { name: '리뷰 실행' }))
    // 진행 표시는 잠깐만 떠 있으므로 같은 순간에 함께 확인한다
    await waitFor(() => {
      expect(screen.getByRole('progressbar', { name: '리뷰 진행률' })).toBeInTheDocument()
      expect(within(card).queryByRole('status')).toBeNull()
    })
    expect(await screen.findByText(/백 정확도/)).toBeInTheDocument()
  })

  it('힌트 버튼은 분석 결과가 오기 전에도 누를 수 있다', async () => {
    renderRoute('/game/classic/opera-game', { engines: { analysis: new UciEngine(() => new FakeWorker({ holdGoCount: 99 })) } })
    const hint = await screen.findByRole('button', { name: '힌트' })
    expect(hint).toBeEnabled()
    fireEvent.click(hint)
    expect(hint).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('힌트를 찾는 중…')).toBeInTheDocument()
  })

  it('리뷰 점수가 있는 수에서는 엔진 라인이나 힌트를 켜야만 실시간 분석을 한다', async () => {
    const workers: FakeWorker[] = []
    const engine = new UciEngine(() => {
      const w = new FakeWorker({ info: () => ['info depth 18 multipv 1 score cp 25 pv e2e4 e7e5'], bestMove: () => 'e2e4' })
      workers.push(w)
      return w
    })
    const liveGos = () => workers.flatMap((w) => w.sent).filter((c) => c === 'go depth 18').length
    renderRoute('/game/classic/opera-game', { engines: { analysis: engine } })
    fireEvent.click(await screen.findByRole('button', { name: '리뷰 실행' }))
    expect(await screen.findByText(/백 정확도/)).toBeInTheDocument()
    await new Promise((r) => setTimeout(r, 200))
    const before = liveGos()
    fireEvent.keyDown(window, { key: 'Home' })
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    await new Promise((r) => setTimeout(r, 250))
    expect(liveGos()).toBe(before)
    fireEvent.click(screen.getByRole('button', { name: '엔진 라인' }))
    await waitFor(() => expect(liveGos()).toBe(before + 1))
    fireEvent.click(screen.getByRole('button', { name: '엔진 라인' }))
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    await new Promise((r) => setTimeout(r, 250))
    expect(liveGos()).toBe(before + 1)
    fireEvent.click(screen.getByRole('button', { name: '힌트' }))
    await waitFor(() => expect(liveGos()).toBe(before + 2))
  })

  it('분기 제목의 수 번호는 시작 포지션의 수 번호를 따른다', async () => {
    const { router, store } = renderRoute('/game/classic/opera-game')
    await screen.findByRole('heading', { name: /Paul Morphy/ })
    for (let i = 0; i < 3; i++) fireEvent.keyDown(window, { key: 'ArrowRight' })
    fireEvent.click(screen.getByRole('button', { name: '여기서 분기' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '시작' }))
    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/play\//))
    const [fork] = await store.forks.list()
    expect(fork.title).toMatch(/· 2수째에서 분기$/)
  })
})
