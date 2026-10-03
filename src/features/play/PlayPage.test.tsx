// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MOVE_EVAL_KEY, resetMoveEvalPrefForTest } from '../../app/moveEvalPref'
import { createFork } from '../../chess/fork'
import { pgnToPlies } from '../../chess/pgn'
import { FakeWorker } from '../../engine/testing/fakeWorker'
import { UciEngine } from '../../engine/UciEngine'
import { getClassic } from '../../sources/classics'
import { createMemoryStore } from '../../storage/db'
import { boardProps } from '../../test/boardMock'
import { renderRoute } from '../../test/renderRoute'

vi.mock('../../components/Board', () => import('../../test/boardMock'))
afterEach(cleanup)
beforeEach(() => {
  localStorage.clear()
  resetMoveEvalPrefForTest()
})

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

async function setupFork(startFen = START, originPly = 0) {
  const store = createMemoryStore()
  await store.forks.put(
    createFork(
      { origin: { kind: 'classic', slug: 'opera-game' }, originPly, startFen, playerColor: 'white', engineElo: 1500, title: '테스트 분기' },
      1,
      'f1',
    ),
  )
  return store
}

describe('PlayPage', () => {
  it('내 수에 엔진이 답하고, 무르기로 두 수를 되돌린다', async () => {
    const store = await setupFork()
    const play = new UciEngine(() => new FakeWorker({ bestMove: () => 'e7e5' }))
    renderRoute('/play/f1', { store, engines: { play } })
    expect(await screen.findByText('내 차례')).toBeInTheDocument()

    act(() => boardProps.current!.movable!.onMove('e2', 'e4'))
    await waitFor(async () => expect((await store.forks.get('f1'))?.moves).toEqual(['e2e4', 'e7e5']))
    expect(await screen.findByText('내 차례')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '무르기' }))
    await waitFor(async () => expect((await store.forks.get('f1'))?.moves).toEqual([]))
  })

  it('불법 수는 무시한다', async () => {
    const store = await setupFork()
    renderRoute('/play/f1', { store })
    await screen.findByText('내 차례')
    act(() => boardProps.current!.movable!.onMove('e2', 'e5'))
    expect((await store.forks.get('f1'))?.moves).toEqual([])
  })

  it('원래 대국의 이후 수순을 보여준다', async () => {
    const plies = pgnToPlies(getClassic('opera-game')!.pgn)
    const store = await setupFork(plies[4].fen, 4)
    renderRoute('/play/f1', { store })
    expect(await screen.findByText(/^d4 Bg4 dxe5/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '원래 대국의 수순' })).toBeInTheDocument()
  })

  it('연습용 분기처럼 시작 포지션이 원래 대국과 다르면 원래 대국의 수순을 숨긴다', async () => {
    // 오페라 게임 4수째는 필리도르 디펜스지만, 시작 포지션은 다른 수순(1.e4 c5)의 끝
    const sicilian = 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2'
    const store = await setupFork(sicilian, 4)
    renderRoute('/play/f1', { store })
    expect(await screen.findByText('연습용 분기라 원래 대국 수순을 보여 주지 않아요.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '원래 대국의 수순' })).toBeNull()
    expect(screen.queryByText(/^d4 Bg4 dxe5/)).toBeNull()
  })

  it('기보는 누를 수 없는 목록으로 보여준다', async () => {
    const store = await setupFork()
    const play = new UciEngine(() => new FakeWorker({ bestMove: () => 'e7e5' }))
    renderRoute('/play/f1', { store, engines: { play } })
    await screen.findByText('내 차례')
    act(() => boardProps.current!.movable!.onMove('e2', 'e4'))
    const moves = screen.getByTestId('play-moves')
    await waitFor(() => expect(within(moves).getByText('e5')).toBeInTheDocument())
    expect(within(moves).queryByRole('button', { name: 'e4', hidden: true })).toBeNull()
  })

  it('Elo 슬라이더는 멈춘 뒤에 한 번만 저장하고, 시트를 닫으면 바로 저장한다', async () => {
    const store = await setupFork()
    const put = vi.spyOn(store.forks, 'put')
    renderRoute('/play/f1', { store })
    await screen.findByText('내 차례')
    fireEvent.click(screen.getByRole('button', { name: '엔진 세기 (Elo 1500)' }))
    const slider = within(screen.getByRole('dialog', { name: '엔진 세기' })).getByRole('slider')
    for (const v of [1510, 1520, 1530, 1540]) fireEvent.change(slider, { target: { value: String(v) } })
    expect(put).not.toHaveBeenCalled()
    await waitFor(() => expect(put).toHaveBeenCalledTimes(1), { timeout: 1000 })
    expect(put.mock.calls[0][0].engineElo).toBe(1540)

    fireEvent.change(slider, { target: { value: '1600' } })
    fireEvent.click(screen.getByRole('button', { name: '닫기' }))
    expect(put).toHaveBeenCalledTimes(2)
    expect(put.mock.calls[1][0].engineElo).toBe(1600)
    await new Promise((r) => setTimeout(r, 400))
    expect(put).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('button', { name: '엔진 세기 (Elo 1600)' })).toBeInTheDocument()
  })

  it('내 수를 두면 평가 카드·더 나은 수 화살표·기보 기호를 보여주고, 끄면 숨기고 기억한다', async () => {
    const store = await setupFork()
    const A3 = 'rnbqkbnr/pppppppp/8/8/8/P7/1PPPPPPP/RNBQKBNR b KQkq - 0 1'
    const analysis = new UciEngine(
      () =>
        new FakeWorker({
          // 점수는 둘 차례 기준. a3 뒤 흑 +1.20 → 백 손실 약 13.6%p로 실수
          info: (fen) => (fen === START ? ['info depth 14 multipv 1 score cp 30 pv e2e4'] : fen === A3 ? ['info depth 14 multipv 1 score cp 120 pv e7e5'] : []),
          bestMove: (fen) => (fen === START ? 'e2e4' : 'e7e5'),
        }),
    )
    // 상대 응수를 손으로 풀어 준다
    let reply: (uci: string) => void = () => {}
    const play = {
      bestMove: vi.fn(() => new Promise<string | null>((r) => (reply = r))),
      stop: vi.fn(),
    } as unknown as UciEngine
    renderRoute('/play/f1', { store, engines: { play, analysis } })
    await screen.findByText('내 차례')
    expect(screen.queryByRole('region', { name: '수 평가' })).toBeNull()

    act(() => boardProps.current!.movable!.onMove('a2', 'a3'))
    const card = await screen.findByRole('region', { name: '수 평가' })
    await waitFor(() => expect(within(card).getByText('실수')).toBeInTheDocument())
    expect(card).toHaveTextContent('1. a3')
    expect(card).toHaveTextContent('더 나은 수 e4')
    // 카드는 보드 아래에 둔다(카드가 생겨도 보드가 밀리지 않는다)
    expect(screen.getByTestId('board').compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    // 내 수가 마지막 수인 동안에만 더 나은 수 화살표를 그린다
    expect(boardProps.current!.shapes).toEqual([expect.objectContaining({ orig: 'e2', dest: 'e4' })])
    await act(async () => reply('e7e5'))
    await waitFor(async () => expect((await store.forks.get('f1'))?.moves).toEqual(['a2a3', 'e7e5']))
    await waitFor(() => expect(boardProps.current!.shapes ?? []).toEqual([]))
    expect(card).toHaveTextContent('더 나은 수 e4')
    const moves = screen.getByTestId('play-moves')
    expect(within(moves).getByTitle('실수')).toHaveTextContent('a3?')

    const toggle = screen.getByRole('button', { name: '수 평가' })
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryByRole('region', { name: '수 평가' })).toBeNull()
    expect(within(moves).queryByTitle('실수')).toBeNull()
    expect(boardProps.current!.shapes ?? []).toEqual([])
    expect(localStorage.getItem(MOVE_EVAL_KEY)).toBe('0')
  })

  it('수 평가가 꺼져 있으면 분석 엔진을 쓰지 않는다', async () => {
    localStorage.setItem(MOVE_EVAL_KEY, '0')
    const store = await setupFork()
    const analysis = new UciEngine(() => new FakeWorker())
    const analyze = vi.spyOn(analysis, 'analyze')
    const play = new UciEngine(() => new FakeWorker({ bestMove: () => 'e7e5' }))
    renderRoute('/play/f1', { store, engines: { play, analysis } })
    await screen.findByText('내 차례')
    act(() => boardProps.current!.movable!.onMove('e2', 'e4'))
    await waitFor(async () => expect((await store.forks.get('f1'))?.moves).toEqual(['e2e4', 'e7e5']))
    expect(screen.getByRole('button', { name: '수 평가' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryByRole('region', { name: '수 평가' })).toBeNull()
    expect(analyze).not.toHaveBeenCalled()
  })

  it('없는 분기는 NotFound', async () => {
    renderRoute('/play/nope')
    expect(await screen.findByRole('heading', { name: '페이지를 찾을 수 없어요' })).toBeInTheDocument()
  })
})
