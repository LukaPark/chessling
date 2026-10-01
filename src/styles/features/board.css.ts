import { globalStyle, style } from '@vanilla-extract/css'
import { BOARD_PALETTES, BOARD_THEMES, PIECE_SETS, pieceUrl, type BoardPalette } from '../boardThemes'
import { fontSize, vars } from '../tokens.css'

export const boardRoot = style({ position: 'relative', width: '100%', aspectRatio: '1 / 1' })
export const boardHost = style({ width: '100%', height: '100%' })

// a8(왼쪽 위)이 밝은 칸: 2×2 타일의 왼쪽 위·오른쪽 아래가 밝다
globalStyle('.cg-wrap cg-board', {
  backgroundColor: vars.color.boardLight,
  backgroundImage: `conic-gradient(${vars.color.boardDark} 0deg 90deg, ${vars.color.boardLight} 90deg 180deg, ${vars.color.boardDark} 180deg 270deg, ${vars.color.boardLight} 270deg 360deg)`,
  backgroundSize: '25% 25%',
  borderRadius: 6,
})
globalStyle('.cg-wrap cg-board square.last-move, .cg-wrap cg-board square.selected', { backgroundColor: vars.color.boardHighlight })
globalStyle('.cg-wrap cg-board square.move-dest', {
  background: `radial-gradient(${vars.color.boardHighlight} 22%, transparent 23%)`,
})
globalStyle('.cg-wrap cg-board square.oc.move-dest', {
  background: `radial-gradient(transparent 0%, transparent 79%, ${vars.color.boardHighlight} 80%)`,
})
globalStyle('.cg-wrap cg-board square.check', {
  background: 'radial-gradient(ellipse at center, rgba(199, 50, 50, 0.9) 0%, rgba(199, 50, 50, 0.35) 45%, transparent 72%)',
})
globalStyle('.cg-wrap coords coord', { color: vars.color.ink, opacity: 0.72, fontSize: fontSize.meta, fontWeight: 500 })
// 좌표는 놓인 칸에 따라 색을 나눈다: 밝은 칸 위는 늘 어두운 글자, 어두운 칸 위는 ink.
// chessground는 칸 색을 coord-light/coord-dark로 표시한다. 파일 좌표는 그대로 맞고, 랭크 좌표는 base CSS가
// 왼쪽(a 파일 쪽)에 놓아 chessground가 가정한 오른쪽 칸과 색이 반대다(양쪽 방향 모두).
globalStyle('.cg-wrap coords.files coord.coord-light, .cg-wrap coords.ranks coord.coord-dark', { color: vars.color.boardInkOnLight })
// chessground.base.css 기본값(left 24px)은 보드 밖으로 1칸 가까이 밀린다 — 각 칸 오른쪽 아래에 붙인다.
globalStyle('.cg-wrap coords.files', { left: 0, bottom: 1, textTransform: 'none' })
globalStyle('.cg-wrap coords.files coord', { flex: '1 1 0', textAlign: 'right', paddingRight: 3 })

// 보드 테마: tokens.css.ts와 같은 방식으로 :root 속성에 따라 칸 색 변수를 덮어쓴다.
// 다크(시스템 다크 포함)는 head 스크립트가 늘 data-theme을 붙이므로 [data-theme="dark"] 하나로 충분하다.
// 다크 규칙은 속성이 하나 더 붙어 명시도가 높아서 라이트 규칙보다 항상 이긴다.
const paletteVars = (p: BoardPalette) => ({
  [vars.color.boardLight]: p.boardLight,
  [vars.color.boardDark]: p.boardDark,
  ...(p.highlight ? { [vars.color.boardHighlight]: p.highlight } : {}),
})
for (const theme of BOARD_THEMES) {
  if (theme === 'cool') continue // 기본값은 tokens.css.ts에 있다
  globalStyle(`:root[data-board="${theme}"]`, { vars: paletteVars(BOARD_PALETTES[theme].light) })
  globalStyle(`:root[data-theme="dark"][data-board="${theme}"]`, { vars: paletteVars(BOARD_PALETTES[theme].dark) })
}

// 기물 세트: cburnett은 chessground CSS(.cg-wrap piece.pawn.white, 명시도 0-3-1)가 기본으로 그린다.
// 다른 세트는 html 속성을 더해 명시도(0-4-2)로 이긴다. 선택한 세트의 이미지만 내려받는다.
const ROLES = { P: 'pawn', N: 'knight', B: 'bishop', R: 'rook', Q: 'queen', K: 'king' } as const
for (const set of PIECE_SETS) {
  if (set === 'cburnett') continue
  for (const [letter, role] of Object.entries(ROLES)) {
    for (const [c, color] of [
      ['w', 'white'],
      ['b', 'black'],
    ] as const) {
      globalStyle(`html[data-pieces="${set}"] .cg-wrap piece.${role}.${color}`, { backgroundImage: `url('${pieceUrl(set, c + letter)}')` })
    }
  }
}
