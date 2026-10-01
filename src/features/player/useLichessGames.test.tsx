// @vitest-environment jsdom
import { act, cleanup, renderHook, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it } from 'vitest'
import { useMswServer } from '../../test/msw'
import { renderRoute } from '../../test/renderRoute'
import { useLichessGames } from './useLichessGames'

const server = useMswServer()
afterEach(cleanup)

function lg(id: string, createdAt = Date.UTC(2026, 8, 29)) {
  return {
    id,
    variant: 'standard',
    speed: 'blitz',
    createdAt,
    status: 'mate',
    winner: 'white',
    players: { white: { user: { name: 'tester' }, rating: 2000 }, black: { user: { name: `rival${id}` }, rating: 1990 } },
  }
}
const line = (o: unknown) => JSON.stringify(o) + '\n'

describe('useLichessGames', () => {
  it('스트림 중간 실패 후 재시도해도 대국이 중복되지 않는다', async () => {
    let calls = 0
    server.use(
      http.get('https://lichess.org/api/games/user/tester', () => {
        calls += 1
        if (calls === 1) {
          const enc = new TextEncoder()
          const body = new ReadableStream({
            start(c) {
              c.enqueue(enc.encode(line(lg('aaaa1111'))))
              setTimeout(() => c.error(new TypeError('network')), 10)
            },
          })
          return new HttpResponse(body)
        }
        return new HttpResponse(line(lg('aaaa1111')) + line(lg('bbbb2222')))
      }),
    )
    const user = userEvent.setup()
    renderRoute('/player/lichess/tester')
    await user.click(await screen.findByRole('button', { name: '다시 시도' }))
    expect(await screen.findByRole('link', { name: /rivalbbbb2222/ })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /rivalaaaa1111/ })).toHaveLength(1)
    expect(screen.getAllByRole('link', { name: /tester.*vs/ })).toHaveLength(2)
  })

  it('loadMore는 언마운트 시 취소된다', async () => {
    const first = Array.from({ length: 30 }, (_, i) => line(lg(`g${i}`, Date.UTC(2026, 8, 29) - i * 1000))).join('')
    let calls = 0
    let aborted!: Promise<void>
    let markAborted!: () => void
    aborted = new Promise<void>((r) => (markAborted = r))
    let secondStarted!: () => void
    const started = new Promise<void>((r) => (secondStarted = r))
    server.use(
      http.get('https://lichess.org/api/games/user/tester', ({ request }) => {
        calls += 1
        if (calls === 1) return new HttpResponse(first)
        request.signal.addEventListener('abort', markAborted)
        secondStarted()
        return new HttpResponse(new ReadableStream({ start() {} }))
      }),
    )
    const { result, unmount } = renderHook(() => useLichessGames('tester'))
    await waitFor(() => expect(result.current.hasMore).toBe(true))
    act(() => {
      result.current.loadMore()
    })
    await started
    unmount()
    await aborted
    expect(calls).toBe(2)
  })
})
