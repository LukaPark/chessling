// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { applyTheme, readStoredTheme, THEME_KEY, useTheme, useThemePreference } from './theme'

function mockSystem(dark: boolean) {
  const listeners: ((e: { matches: boolean }) => void)[] = []
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: dark,
      addEventListener: (_: string, fn: (e: { matches: boolean }) => void) => listeners.push(fn),
      removeEventListener: () => {},
    })),
  )
  return (next: boolean) => listeners.forEach((fn) => fn({ matches: next }))
}

beforeEach(() => {
  localStorage.clear()
  delete document.documentElement.dataset.theme
})
afterEach(() => vi.unstubAllGlobals())

describe('theme', () => {
  it('저장값이 올바르지 않으면 null', () => {
    localStorage.setItem(THEME_KEY, 'purple')
    expect(readStoredTheme()).toBeNull()
    localStorage.setItem(THEME_KEY, 'dark')
    expect(readStoredTheme()).toBe('dark')
  })

  it('applyTheme은 data-theme과 color-scheme을 설정한다', () => {
    applyTheme('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(document.documentElement.style.colorScheme).toBe('dark')
  })

  it('toggle은 테마를 바꾸고 저장한다', () => {
    mockSystem(false)
    applyTheme('light')
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('light')
    act(() => result.current.toggle())
    expect(result.current.theme).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem(THEME_KEY)).toBe('dark')
  })

  it('명시 선택이 없으면 시스템 변경을 따른다', () => {
    const emit = mockSystem(false)
    applyTheme('light')
    const { result } = renderHook(() => useTheme())
    act(() => emit(true))
    expect(result.current.theme).toBe('dark')
    expect(localStorage.getItem(THEME_KEY)).toBeNull()
  })

  it('명시 선택이 있으면 시스템 변경을 무시한다', () => {
    const emit = mockSystem(false)
    localStorage.setItem(THEME_KEY, 'light')
    applyTheme('light')
    const { result } = renderHook(() => useTheme())
    act(() => emit(true))
    expect(result.current.theme).toBe('light')
  })

  it('선호도: 저장값이 없으면 system, 있으면 그 값', () => {
    mockSystem(false)
    const { result } = renderHook(() => useThemePreference())
    expect(result.current.preference).toBe('system')
    act(() => result.current.setPreference('dark'))
    expect(result.current.preference).toBe('dark')
    expect(localStorage.getItem(THEME_KEY)).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('선호도 system은 저장값을 지우고 시스템 테마를 따른다', () => {
    mockSystem(true)
    localStorage.setItem(THEME_KEY, 'light')
    applyTheme('light')
    const { result } = renderHook(() => useThemePreference())
    expect(result.current.preference).toBe('light')
    act(() => result.current.setPreference('system'))
    expect(result.current.preference).toBe('system')
    expect(localStorage.getItem(THEME_KEY)).toBeNull()
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('설정에서 바꾸면 헤더 토글도 같은 테마를 본다', () => {
    mockSystem(false)
    applyTheme('light')
    const toggle = renderHook(() => useTheme())
    const pref = renderHook(() => useThemePreference())
    act(() => pref.result.current.setPreference('dark'))
    expect(toggle.result.current.theme).toBe('dark')
    act(() => toggle.result.current.toggle())
    expect(pref.result.current.preference).toBe('light')
  })

  it('저장에 실패해도 고른 선호도를 이번 세션 동안 유지한다', () => {
    mockSystem(false)
    applyTheme('light')
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied')
    })
    const { result } = renderHook(() => useThemePreference())
    act(() => result.current.setPreference('dark'))
    expect(result.current.preference).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    spy.mockRestore()
    act(() => result.current.setPreference('system')) // 저장이 되면 메모리 값을 비운다
    expect(result.current.preference).toBe('system')
  })
})
