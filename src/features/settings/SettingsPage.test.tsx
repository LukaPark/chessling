// @vitest-environment jsdom
import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BOARD_KEY, PIECES_KEY } from '../../app/boardPrefs'
import { applyTheme, THEME_KEY } from '../../app/theme'
import { renderRoute } from '../../test/renderRoute'

vi.mock('../../components/Board', () => import('../../test/boardMock'))

const root = document.documentElement
beforeEach(() => {
  localStorage.clear()
  delete root.dataset.board
  delete root.dataset.pieces
  applyTheme('light')
})
afterEach(cleanup)

async function open() {
  renderRoute('/settings')
  await screen.findByRole('heading', { level: 1, name: '설정' })
}

describe('SettingsPage', () => {
  it('미리보기 보드와 보드·기물·화면 세 그룹', async () => {
    await open()
    expect(screen.getByTestId('board')).toHaveAttribute('data-fen', expect.stringContaining('r1bq1rk1/pp2bppp'))
    const board = screen.getByRole('group', { name: '보드' })
    expect(within(board).getAllByRole('radio')).toHaveLength(6)
    expect(within(board).getByRole('radio', { name: '쿨톤' })).toBeChecked()
    const pieces = screen.getByRole('group', { name: '기물' })
    expect(within(pieces).getAllByRole('radio')).toHaveLength(4)
    expect(within(pieces).getByRole('radio', { name: '기본' })).toBeChecked()
    const theme = screen.getByRole('group', { name: '화면' })
    expect(within(theme).getByRole('radio', { name: '시스템' })).toBeChecked()
  })

  it('보드를 고르면 html data-board를 바꾸고 저장한다', async () => {
    await open()
    const green = within(screen.getByRole('group', { name: '보드' })).getByRole('radio', { name: '그린' })
    fireEvent.click(green)
    expect(green).toBeChecked()
    expect(root.dataset.board).toBe('green')
    expect(localStorage.getItem(BOARD_KEY)).toBe('green')
  })

  it('기물 세트를 고르면 html data-pieces를 바꾸고 저장한다', async () => {
    await open()
    const merida = within(screen.getByRole('group', { name: '기물' })).getByRole('radio', { name: '메리다' })
    fireEvent.click(merida)
    expect(merida).toBeChecked()
    expect(root.dataset.pieces).toBe('merida')
    expect(localStorage.getItem(PIECES_KEY)).toBe('merida')
  })

  it('시스템을 고르면 저장한 테마를 지우고, 헤더 토글도 따라간다', async () => {
    await open()
    const theme = screen.getByRole('group', { name: '화면' })
    fireEvent.click(within(theme).getByRole('radio', { name: '다크' }))
    expect(localStorage.getItem(THEME_KEY)).toBe('dark')
    expect(root.dataset.theme).toBe('dark')
    expect(screen.getByRole('button', { name: '라이트 모드로 전환' })).toBeInTheDocument()
    fireEvent.click(within(theme).getByRole('radio', { name: '시스템' }))
    expect(localStorage.getItem(THEME_KEY)).toBeNull()
    expect(root.dataset.theme).toBe('light') // 테스트 환경의 시스템 테마는 라이트
    expect(within(theme).getByRole('radio', { name: '시스템' })).toBeChecked()
  })
})
