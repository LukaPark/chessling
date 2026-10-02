// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { GUIDE_KEY, resetGuidePrefForTest, useGuidePref } from './guidePref'

beforeEach(() => {
  localStorage.clear()
  resetGuidePrefForTest()
})

describe('useGuidePref', () => {
  it('기본값은 켜짐', () => {
    expect(renderHook(() => useGuidePref()).result.current[0]).toBe(true)
  })
  it('끄면 저장하고 다른 구독자에게도 알린다', () => {
    const a = renderHook(() => useGuidePref())
    const b = renderHook(() => useGuidePref())
    act(() => a.result.current[1](false))
    expect(localStorage.getItem(GUIDE_KEY)).toBe('0')
    expect(b.result.current[0]).toBe(false)
  })
  it('저장값 "0"을 읽는다', () => {
    localStorage.setItem(GUIDE_KEY, '0')
    expect(renderHook(() => useGuidePref()).result.current[0]).toBe(false)
  })
})
