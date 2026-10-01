import { createVar, style } from '@vanilla-extract/css'
import { fontSize, mq, space, vars, weight } from '../tokens.css'

/**
 * md 이상에서 보드 열의 최대 폭. 헤더와 하단 조작 막대가 한 화면에 들어오도록 화면 높이에 맞춰 줄인다.
 * svh를 모르는 브라우저는 vh로. (같은 속성을 두 번 쓰는 폴백은 CSS 압축에서 앞의 값이 사라져 변수로 둔다)
 */
const viewportHeight = createVar()
export const boardColumn = `minmax(0, min(640px, calc(${viewportHeight} - 240px)))`

export const page = style({
  display: 'grid',
  gap: space[4],
  vars: { [viewportHeight]: '100vh' },
  '@supports': { '(height: 100svh)': { vars: { [viewportHeight]: '100svh' } } },
  '@media': {
    [mq.md]: {
      gridTemplateColumns: `${boardColumn} minmax(280px, 1fr)`,
      columnGap: space[6],
      rowGap: space[4],
      alignItems: 'start',
      paddingBottom: space[7],
    },
  },
})
export const header = style({ display: 'grid', gap: space[2], '@media': { [mq.md]: { gridColumn: '1 / -1' } } })
export const headRow = style({ display: 'flex', alignItems: 'center', gap: space[2] })
export const title = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: space[2],
  flex: 1,
  minWidth: 0,
  fontSize: fontSize.title,
  '@media': { [mq.md]: { fontSize: fontSize.section } },
})
export const vs = style({ color: vars.color.muted, fontWeight: weight.regular })
export const meta = style({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: space[2],
  color: vars.color.muted,
  fontSize: fontSize.meta,
})
export const result = style({ color: vars.color.ink, fontWeight: weight.medium, fontVariantNumeric: 'tabular-nums' })
export const stage = style({
  display: 'grid',
  gap: space[3],
  '@media': { [mq.md]: { gridColumn: 1, gridTemplateColumns: 'auto minmax(0, 1fr)', alignItems: 'stretch' } },
})
export const boardWrap = style({ position: 'relative', width: '100%', touchAction: 'pan-y' })
export const panel = style({
  display: 'grid',
  gap: space[4],
  alignContent: 'start',
  '@media': { [mq.md]: { gridColumn: 2, gridRow: '2 / span 2' } },
})
export const controls = style({ '@media': { [mq.md]: { gridColumn: 1 } } })
export const note = style({ color: vars.color.muted, fontSize: fontSize.control })
export const reviewIdle = style({ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: space[3] })

export const player = style({ display: "inline-flex", flexWrap: "wrap", alignItems: "center", gap: space[2] })
export const side = style({ display: "inline-flex", alignItems: "center", whiteSpace: "nowrap", fontSize: fontSize.meta, color: vars.color.muted })
