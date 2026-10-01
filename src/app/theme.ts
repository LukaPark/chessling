import { useCallback, useEffect, useSyncExternalStore } from 'react'

export type ThemeName = 'light' | 'dark'
/** 'system'은 저장값이 없어 시스템 설정을 따르는 상태 */
export type ThemePreference = ThemeName | 'system'
export const THEME_KEY = 'chessling-theme'
const TRANSITION_MS = 300

export function readStoredTheme(): ThemeName | null {
  try {
    const v = localStorage.getItem(THEME_KEY)
    return v === 'light' || v === 'dark' ? v : null
  } catch {
    return null
  }
}

export function systemTheme(): ThemeName {
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function applyTheme(theme: ThemeName, { animate = false }: { animate?: boolean } = {}): void {
  const root = document.documentElement
  if (animate && !prefersReducedMotion()) {
    root.setAttribute('data-theme-transition', '')
    window.setTimeout(() => root.removeAttribute('data-theme-transition'), TRANSITION_MS)
  }
  root.dataset.theme = theme
  root.style.colorScheme = theme
}

function currentTheme(): ThemeName {
  const t = document.documentElement.dataset.theme
  return t === 'dark' || t === 'light' ? t : systemTheme()
}
// 저장에 실패하면(사생활 보호 모드 등) 이번 세션 동안은 메모리의 선택을 쓴다
let unsavedPreference: ThemePreference | null = null
const currentPreference = (): ThemePreference => unsavedPreference ?? readStoredTheme() ?? 'system'

// 헤더 토글과 설정 화면이 같은 값을 보도록 작은 외부 저장소로 묶는다
const listeners = new Set<() => void>()
function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
const notify = () => listeners.forEach((fn) => fn())

function writeStored(pref: ThemePreference): void {
  try {
    if (pref === 'system') localStorage.removeItem(THEME_KEY)
    else localStorage.setItem(THEME_KEY, pref)
    unsavedPreference = null
  } catch {
    unsavedPreference = pref // 저장할 수 없어도 이번 세션에는 적용한다
  }
}

export function setThemePreference(pref: ThemePreference): void {
  writeStored(pref)
  applyTheme(pref === 'system' ? systemTheme() : pref, { animate: true })
  notify()
}

/** 명시 선택이 없으면 시스템 테마 변경을 따른다 */
function useSystemThemeSync(): void {
  useEffect(() => {
    if (typeof matchMedia !== 'function') return
    const mql = matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e: { matches: boolean }) => {
      if (currentPreference() !== 'system') return
      applyTheme(e.matches ? 'dark' : 'light', { animate: true })
      notify()
    }
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])
}

export function useTheme(): { theme: ThemeName; toggle: () => void } {
  useSystemThemeSync()
  const theme = useSyncExternalStore(subscribe, currentTheme)
  const toggle = useCallback(() => setThemePreference(currentTheme() === 'dark' ? 'light' : 'dark'), [])
  return { theme, toggle }
}

export function useThemePreference(): { preference: ThemePreference; setPreference: (p: ThemePreference) => void } {
  useSystemThemeSync()
  const preference = useSyncExternalStore(subscribe, currentPreference)
  return { preference, setPreference: setThemePreference }
}
