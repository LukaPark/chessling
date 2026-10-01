// @vitest-environment jsdom
import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { createFork } from '../../chess/fork'
import { createMemoryStore } from '../../storage/db'
import { renderRoute } from '../../test/renderRoute'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const make = (id: string, title: string, updatedAt: number) =>
  createFork({ origin: { kind: 'classic', slug: 'opera-game' }, originPly: 2, startFen: START, playerColor: 'white', engineElo: 1800, title }, updatedAt, id)

it('최근 순으로 보여주고 삭제할 수 있다', async () => {
  const store = createMemoryStore()
  await store.forks.put(make('a', '첫 분기', 1))
  await store.forks.put(make('b', '둘째 분기', 2))
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  renderRoute('/forks', { store })
  const items = await screen.findAllByRole('heading', { level: 2 })
  expect(items.map((h) => h.textContent)).toEqual(['둘째 분기', '첫 분기'])
  expect(screen.getAllByRole('link', { name: '이어 두기' })[0]).toHaveAttribute('href', '/play/b')
  await userEvent.click(screen.getAllByRole('button', { name: '삭제' })[0])
  await waitFor(() => expect(screen.queryByText('둘째 분기')).toBeNull())
  expect(await store.forks.get('b')).toBeUndefined()
})

it('비어 있으면 안내 문구', async () => {
  renderRoute('/forks')
  expect(await screen.findByText(/아직 분기한 대국이 없어요/)).toBeInTheDocument()
})

it('삭제하면 분기 쿼리 캐시도 지운다', async () => {
  const store = createMemoryStore()
  await store.forks.put(make('a', '첫 분기', 1))
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  const { queryClient } = renderRoute('/forks', { store })
  queryClient.setQueryData(['fork', 'a'], make('a', '첫 분기', 1))
  await userEvent.click(await screen.findByRole('button', { name: '삭제' }))
  await waitFor(() => expect(screen.queryByText('첫 분기')).toBeNull())
  expect(queryClient.getQueryData(['fork', 'a'])).toBeUndefined()
  expect(queryClient.getQueryCache().find({ queryKey: ['fork', 'a'] })).toBeUndefined()
})
