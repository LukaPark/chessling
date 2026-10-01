// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { applyTheme, THEME_KEY } from './theme'
import { renderRoute } from '../test/renderRoute'

beforeEach(() => {
  localStorage.clear()
  applyTheme('light')
})
afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
})

it('본문 바로가기와 주요 메뉴', () => {
  renderRoute('/licenses')
  expect(screen.getByRole('link', { name: '본문 바로가기' })).toHaveAttribute('href', '#main')
  const nav = screen.getByRole('navigation', { name: '주요 메뉴' })
  expect(nav).toBeInTheDocument()
  expect(screen.getByRole('link', { name: '대회' })).toHaveAttribute('href', '/events')
  expect(screen.getByRole('link', { name: '명국' })).toHaveAttribute('href', '/classics')
  expect(screen.getByRole('link', { name: '내 분기' })).toHaveAttribute('href', '/forks')
  expect(screen.getByRole('main')).toHaveAttribute('id', 'main')
})

it('테마 토글', () => {
  renderRoute('/licenses')
  fireEvent.click(screen.getByRole('button', { name: '다크 모드로 전환' }))
  expect(document.documentElement.dataset.theme).toBe('dark')
  expect(localStorage.getItem(THEME_KEY)).toBe('dark')
  expect(screen.getByRole('button', { name: '라이트 모드로 전환' })).toBeInTheDocument()
})

it('소스 주소가 없으면 GitHub 링크를 숨긴다', () => {
  renderRoute('/licenses')
  expect(screen.queryByRole('link', { name: 'GitHub 저장소' })).toBeNull()
})

it('소스 주소가 있으면 GitHub 링크를 보인다', () => {
  vi.stubEnv('VITE_SOURCE_URL', 'https://github.com/x/chessling')
  renderRoute('/licenses')
  expect(screen.getByRole('link', { name: 'GitHub 저장소' })).toHaveAttribute('href', 'https://github.com/x/chessling')
})

it('헤더에 설정 링크가 있고, 설정 화면에서는 현재 위치로 표시한다', async () => {
  renderRoute('/licenses')
  expect(screen.getByRole('link', { name: '설정' })).toHaveAttribute('href', '/settings')
  expect(screen.getByRole('link', { name: '설정' })).not.toHaveAttribute('aria-current')
  cleanup()
  renderRoute('/settings')
  expect(screen.getByRole('link', { name: '설정' })).toHaveAttribute('aria-current', 'page')
})
