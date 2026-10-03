// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
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

  it('없는 분기는 NotFound', async () => {
    renderRoute('/play/nope')
    expect(await screen.findByRole('heading', { name: '페이지를 찾을 수 없어요' })).toBeInTheDocument()
  })
})
