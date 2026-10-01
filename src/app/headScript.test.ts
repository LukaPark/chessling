// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BOARD_KEY, BOARD_THEMES, PIECE_SETS, PIECES_KEY } from './boardPrefs'
import { THEME_KEY } from './theme'

// index.html <head>의 인라인 스크립트(첫 페인트 전 적용)를 그대로 실행한다
const html = readFileSync(resolve(__dirname, '../../index.html'), 'utf8')
const source = /<script>([\s\S]*?)<\/script>/.exec(html)![1]
const run = () => new Function(source)()
const root = document.documentElement

beforeEach(() => {
  localStorage.clear()
  delete root.dataset.theme
  delete root.dataset.board
  delete root.dataset.pieces
})
afterEach(() => vi.restoreAllMocks())

describe('head 인라인 스크립트', () => {
  it('저장값이 없으면 시스템 테마와 기본 보드·기물', () => {
    run()
    expect(root.dataset.theme).toBe('light')
    expect(root.dataset.board).toBe('cool')
    expect(root.dataset.pieces).toBe('cburnett')
  })

  it('저장한 테마·보드·기물을 적용한다', () => {
    localStorage.setItem(THEME_KEY, 'dark')
    localStorage.setItem(BOARD_KEY, 'green')
    localStorage.setItem(PIECES_KEY, 'merida')
    run()
    expect(root.dataset.theme).toBe('dark')
    expect(root.dataset.board).toBe('green')
    expect(root.dataset.pieces).toBe('merida')
  })

  it('앱의 허용 목록과 같은 값을 받아들인다', () => {
    for (const b of BOARD_THEMES) {
      localStorage.setItem(BOARD_KEY, b)
      run()
      expect(root.dataset.board).toBe(b)
    }
    for (const p of PIECE_SETS) {
      localStorage.setItem(PIECES_KEY, p)
      run()
      expect(root.dataset.pieces).toBe(p)
    }
  })

  it('모르는 값은 기본값으로', () => {
    localStorage.setItem(BOARD_KEY, 'neon')
    localStorage.setItem(PIECES_KEY, 'horsey')
    run()
    expect(root.dataset.board).toBe('cool')
    expect(root.dataset.pieces).toBe('cburnett')
  })

  it('localStorage가 예외를 던져도 기본값을 적용한다', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied')
    })
    run()
    expect(root.dataset.theme).toBe('light')
    expect(root.dataset.board).toBe('cool')
    expect(root.dataset.pieces).toBe('cburnett')
  })
})
