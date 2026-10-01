// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAutoplay } from './useAutoplay'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('useAutoplay', () => {
  it('start 전에는 멈춰 있고, start하면 900ms마다 한 수씩, 끝에서 멈춘다', () => {
    const { result } = renderHook(() => useAutoplay(3))
    expect(result.current).toMatchObject({ ply: 0, playing: false, finished: false })
    act(() => result.current.start())
    act(() => {
      vi.advanceTimersByTime(900)
    })
    expect(result.current.ply).toBe(1)
    act(() => {
      vi.advanceTimersByTime(1800)
    })
    expect(result.current).toMatchObject({ ply: 3, playing: false, finished: true })
  })

  it('start는 처음 한 번만 동작한다', () => {
    const { result } = renderHook(() => useAutoplay(5))
    act(() => result.current.start())
    act(() => result.current.pause())
    act(() => result.current.start())
    expect(result.current.playing).toBe(false)
    act(() => result.current.play())
    expect(result.current.playing).toBe(true)
  })

  it('끝난 뒤 play와 restart는 처음부터 다시', () => {
    const { result } = renderHook(() => useAutoplay(1))
    act(() => result.current.start())
    act(() => {
      vi.advanceTimersByTime(900)
    })
    expect(result.current.finished).toBe(true)
    act(() => result.current.play())
    expect(result.current).toMatchObject({ ply: 0, playing: true })
    act(() => result.current.restart())
    expect(result.current).toMatchObject({ ply: 0, playing: true })
  })

  it('탭이 숨겨지면 멈춘다', () => {
    const { result } = renderHook(() => useAutoplay(5))
    act(() => result.current.start())
    Object.defineProperty(document, 'hidden', { configurable: true, value: true })
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(result.current.playing).toBe(false)
    Object.defineProperty(document, 'hidden', { configurable: true, value: false })
  })

  it('모션 감소면 마지막 포지션에 고정', () => {
    const { result } = renderHook(() => useAutoplay(5, { reduced: true }))
    expect(result.current).toMatchObject({ ply: 5, finished: true })
    act(() => result.current.start())
    act(() => result.current.play())
    expect(result.current.playing).toBe(false)
  })
})
