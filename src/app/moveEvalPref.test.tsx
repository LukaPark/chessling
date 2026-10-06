// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MOVE_EVAL_KEY, resetMoveEvalPrefForTest, useMoveEvalPref } from './moveEvalPref'

beforeEach(() => {
  localStorage.clear()
  resetMoveEvalPrefForTest()
})
afterEach(() => vi.restoreAllMocks())

describe('useMoveEvalPref', () => {
  it('기본값은 켜짐', () => {
    expect(renderHook(() => useMoveEvalPref()).result.current[0]).toBe(true)
  })
  it('끄면 저장하고 다른 구독자에게도 알린다', () => {
    const a = renderHook(() => useMoveEvalPref())
    const b = renderHook(() => useMoveEvalPref())
    act(() => a.result.current[1](false))
    expect(localStorage.getItem(MOVE_EVAL_KEY)).toBe('0')
    expect(b.result.current[0]).toBe(false)
  })
  it('저장값 "0"을 읽는다', () => {
    localStorage.setItem(MOVE_EVAL_KEY, '0')
    expect(renderHook(() => useMoveEvalPref()).result.current[0]).toBe(false)
  })
  it('저장소를 쓸 수 없어도 켜짐으로 시작하고, 이번 세션에는 바꾼 값을 쓴다', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied')
    })
    const h = renderHook(() => useMoveEvalPref())
    expect(h.result.current[0]).toBe(true)
    act(() => h.result.current[1](false))
    expect(h.result.current[0]).toBe(false)
  })
})
