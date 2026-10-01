// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BOARD_KEY, PIECES_KEY, readStoredBoard, readStoredPieces, useBoardPrefs } from './boardPrefs'

beforeEach(() => {
  localStorage.clear()
  delete document.documentElement.dataset.board
  delete document.documentElement.dataset.pieces
})
afterEach(() => vi.restoreAllMocks())

describe('boardPrefs', () => {
  it('저장값이 없으면 기본값 cool·cburnett', () => {
    expect(readStoredBoard()).toBe('cool')
    expect(readStoredPieces()).toBe('cburnett')
    const { result } = renderHook(() => useBoardPrefs())
    expect(result.current.board).toBe('cool')
    expect(result.current.pieces).toBe('cburnett')
  })

  it('허용 목록에 없는 값은 기본값으로 되돌린다', () => {
    localStorage.setItem(BOARD_KEY, 'neon')
    localStorage.setItem(PIECES_KEY, 'horsey')
    expect(readStoredBoard()).toBe('cool')
    expect(readStoredPieces()).toBe('cburnett')
    document.documentElement.dataset.board = 'neon'
    const { result } = renderHook(() => useBoardPrefs())
    expect(result.current.board).toBe('cool')
    expect(result.current.pieces).toBe('cburnett')
  })

  it('올바른 저장값을 읽는다', () => {
    localStorage.setItem(BOARD_KEY, 'green')
    localStorage.setItem(PIECES_KEY, 'merida')
    const { result } = renderHook(() => useBoardPrefs())
    expect(result.current.board).toBe('green')
    expect(result.current.pieces).toBe('merida')
  })

  it('선택하면 html 속성을 바꾸고 저장한다', () => {
    const { result } = renderHook(() => useBoardPrefs())
    act(() => result.current.setBoard('brown'))
    act(() => result.current.setPieces('fantasy'))
    expect(result.current.board).toBe('brown')
    expect(result.current.pieces).toBe('fantasy')
    expect(document.documentElement.dataset.board).toBe('brown')
    expect(document.documentElement.dataset.pieces).toBe('fantasy')
    expect(localStorage.getItem(BOARD_KEY)).toBe('brown')
    expect(localStorage.getItem(PIECES_KEY)).toBe('fantasy')
  })

  it('다른 컴포넌트의 훅도 같은 값을 본다', () => {
    const a = renderHook(() => useBoardPrefs())
    const b = renderHook(() => useBoardPrefs())
    act(() => a.result.current.setBoard('purple'))
    act(() => a.result.current.setPieces('chessnut'))
    expect(b.result.current.board).toBe('purple')
    expect(b.result.current.pieces).toBe('chessnut')
  })

  it('localStorage가 예외를 던져도 기본값으로 동작하고 선택을 적용한다', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied')
    })
    const { result } = renderHook(() => useBoardPrefs())
    expect(result.current.board).toBe('cool')
    act(() => result.current.setBoard('gray'))
    act(() => result.current.setPieces('merida'))
    expect(result.current.board).toBe('gray')
    expect(document.documentElement.dataset.board).toBe('gray')
    expect(document.documentElement.dataset.pieces).toBe('merida')
  })
})
