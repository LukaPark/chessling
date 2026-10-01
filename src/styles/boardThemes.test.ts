import { describe, expect, it } from 'vitest'
import { BOARD_PALETTES, BOARD_THEMES } from './boardThemes'

// WCAG 2.x 상대 휘도·대비
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

// 하한: 두 칸 구분, 어두운 칸 위 검은 기물(#000 외곽선), 밝은 칸 위 흰 기물(검은 외곽선이 있어 낮은 하한)
const FLOOR = { squares: 1.9, blackOnDark: 3.0, whiteOnLight: 1.1 }

describe('보드 팔레트 대비', () => {
  for (const theme of BOARD_THEMES) {
    for (const mode of ['light', 'dark'] as const) {
      it(`${theme} ${mode}`, () => {
        const { boardLight, boardDark } = BOARD_PALETTES[theme][mode]
        expect(contrast(boardLight, boardDark)).toBeGreaterThanOrEqual(FLOOR.squares)
        expect(contrast('#000000', boardDark)).toBeGreaterThanOrEqual(FLOOR.blackOnDark)
        expect(contrast('#ffffff', boardLight)).toBeGreaterThanOrEqual(FLOOR.whiteOnLight)
      })
    }
  }
})
