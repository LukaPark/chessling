// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { addRecentPlayer, RECENT_PLAYERS_KEY, removeRecentPlayer, resetRecentPlayersForTest, useRecentPlayers } from './recentPlayers'

beforeEach(() => {
  localStorage.clear()
  resetRecentPlayersForTest()
})
afterEach(() => vi.restoreAllMocks())

const stored = () => JSON.parse(localStorage.getItem(RECENT_PLAYERS_KEY) ?? 'null')

describe('recentPlayers', () => {
  it('처음에는 비어 있다', () => {
    expect(renderHook(() => useRecentPlayers()).result.current).toEqual([])
  })

  it('최근 것이 앞에 오고, 저장하며 구독자에게 알린다', () => {
    const h = renderHook(() => useRecentPlayers())
    act(() => {
      addRecentPlayer({ platform: 'chesscom', username: 'hikaru' })
      addRecentPlayer({ platform: 'lichess', username: 'DrNykterstein' })
    })
    const expected = [
      { platform: 'lichess', username: 'DrNykterstein' },
      { platform: 'chesscom', username: 'hikaru' },
    ]
    expect(h.result.current).toEqual(expected)
    expect(stored()).toEqual(expected)
  })

  it('같은 플랫폼의 같은 아이디(대소문자 무시)는 앞으로 옮기고 마지막 철자를 쓴다', () => {
    addRecentPlayer({ platform: 'chesscom', username: 'hikaru' })
    addRecentPlayer({ platform: 'lichess', username: 'hikaru' })
    addRecentPlayer({ platform: 'chesscom', username: 'Hikaru' })
    expect(renderHook(() => useRecentPlayers()).result.current).toEqual([
      { platform: 'chesscom', username: 'Hikaru' },
      { platform: 'lichess', username: 'hikaru' },
    ])
  })

  it('최대 3개까지만 남긴다', () => {
    for (const u of ['a', 'b', 'c', 'd']) addRecentPlayer({ platform: 'lichess', username: u })
    expect(renderHook(() => useRecentPlayers()).result.current.map((p) => p.username)).toEqual(['d', 'c', 'b'])
    expect(stored()).toHaveLength(3)
  })

  it('플랫폼과 아이디로 지운다', () => {
    addRecentPlayer({ platform: 'chesscom', username: 'hikaru' })
    addRecentPlayer({ platform: 'lichess', username: 'hikaru' })
    const h = renderHook(() => useRecentPlayers())
    act(() => removeRecentPlayer({ platform: 'chesscom', username: 'HIKARU' }))
    expect(h.result.current).toEqual([{ platform: 'lichess', username: 'hikaru' }])
    expect(stored()).toEqual([{ platform: 'lichess', username: 'hikaru' }])
  })

  it('저장된 값이 깨졌거나 모르는 모양이면 비어 있는 것으로 본다', () => {
    for (const raw of ['{not json', '"hikaru"', '{"platform":"chesscom"}', 'null']) {
      localStorage.setItem(RECENT_PLAYERS_KEY, raw)
      resetRecentPlayersForTest()
      expect(renderHook(() => useRecentPlayers()).result.current, raw).toEqual([])
    }
  })

  it('알 수 없는 항목은 버리고 올바른 항목만 읽는다', () => {
    localStorage.setItem(
      RECENT_PLAYERS_KEY,
      JSON.stringify([{ platform: 'fide', username: 'x' }, { platform: 'lichess', username: '' }, 3, { platform: 'lichess', username: 'ok' }]),
    )
    expect(renderHook(() => useRecentPlayers()).result.current).toEqual([{ platform: 'lichess', username: 'ok' }])
  })

  it('저장소를 쓸 수 없으면 빈 목록이고, 추가해도 던지지 않는다', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied')
    })
    const h = renderHook(() => useRecentPlayers())
    expect(h.result.current).toEqual([])
    act(() => addRecentPlayer({ platform: 'chesscom', username: 'hikaru' }))
    expect(h.result.current).toEqual([])
  })
})
