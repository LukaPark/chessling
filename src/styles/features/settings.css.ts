import { createVar, style, styleVariants } from '@vanilla-extract/css'
import { BOARD_PALETTES } from '../boardThemes'
import { fontSize, mq, radius, space, vars, weight } from '../tokens.css'

export const page = style({
  display: 'grid',
  gap: space[5],
  paddingBottom: space[7],
  '@media': {
    [mq.md]: {
      gridTemplateColumns: 'minmax(0, 400px) minmax(0, 1fr)',
      columnGap: space[7],
      rowGap: space[5],
      alignItems: 'start',
    },
  },
})
export const head = style({ display: 'grid', gap: space[2], '@media': { [mq.md]: { gridColumn: '1 / -1' } } })
export const preview = style({
  margin: 0,
  width: '100%',
  maxWidth: 400,
  '@media': { [mq.md]: { position: 'sticky', top: 84 } },
})
export const sections = style({ display: 'grid', gap: space[6], minWidth: 0 })
export const section = style({ display: 'grid', gap: space[3] })
export const sectionTitle = style({ fontSize: fontSize.title, fontWeight: weight.medium })

// 라디오 목록. 원래 input은 옵션 전체를 덮고 투명해서, 누르는 곳 어디든 선택된다(Segmented와 같은 방식).
export const group = style({ margin: 0, padding: 0, border: 0, minWidth: 0 })
export const grid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(84px, 1fr))',
  gap: space[2],
})
export const pieceGrid = style([grid, { gridTemplateColumns: 'repeat(auto-fill, minmax(112px, 1fr))' }])
export const option = style({
  position: 'relative',
  display: 'grid',
  justifyItems: 'center',
  alignContent: 'center',
  gap: space[2],
  minHeight: 44,
  padding: `${space[3]} ${space[2]}`,
  borderRadius: radius.action,
  color: vars.color.muted,
  fontSize: fontSize.control,
  cursor: 'pointer',
  textAlign: 'center',
  selectors: {
    '&:hover': { color: vars.color.ink },
    '&:has(input:checked)': { background: vars.color.surfaceSubtle, color: vars.color.ink },
    '&:has(input:focus-visible)': { outline: `3px solid ${vars.color.accent}`, outlineOffset: 1 },
  },
})
export const input = style({ position: 'absolute', inset: 0, margin: 0, opacity: 0, cursor: 'pointer' })

// 선택한 항목은 견본 둘레에 강조색 링을 두른다(칸 색이 배경과 섞이지 않게 안쪽에 배경색 틈을 둔다)
const ring = {
  selectors: {
    [`${option}:has(input:checked) &`]: { boxShadow: `0 0 0 2px ${vars.color.surfaceSubtle}, 0 0 0 4px ${vars.color.accent}` },
  },
}

const swLight = createVar()
const swDark = createVar()
export const swatch = style({
  width: 36,
  height: 36,
  borderRadius: 8,
  background: `conic-gradient(${swDark} 0deg 90deg, ${swLight} 90deg 180deg, ${swDark} 180deg 270deg, ${swLight} 270deg 360deg)`,
  ...ring,
})
export const swatchColors = styleVariants(BOARD_PALETTES, ({ light, dark }) => ({
  vars: { [swLight]: light.boardLight, [swDark]: light.boardDark },
  selectors: { ':root[data-theme="dark"] &': { vars: { [swLight]: dark.boardLight, [swDark]: dark.boardDark } } },
}))

// 기물 썸네일은 지금 고른 보드 색 위에 놓는다: 밝은 칸에 백 나이트, 어두운 칸에 흑 킹
export const thumbs = style({ display: 'flex', borderRadius: 8, overflow: 'hidden', ...ring })
export const thumb = style({ display: 'block', width: 40, height: 40, padding: 2 })
export const thumbLight = style([thumb, { background: vars.color.boardLight }])
export const thumbDark = style([thumb, { background: vars.color.boardDark }])
