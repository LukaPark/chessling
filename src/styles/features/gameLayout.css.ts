import { createVar, style } from '@vanilla-extract/css'
import { fontSize, mq, space, vars, weight } from '../tokens.css'

/**
 * md 이상에서 보드 열의 최대 폭. 헤더와 하단 조작 막대가 한 화면에 들어오도록 화면 높이에 맞춰 줄인다.
 * `allowance`는 화면 높이에서 보드 열 폭을 빼고 남겨야 하는 높이다.
 * svh를 모르는 브라우저는 vh로. (같은 속성을 두 번 쓰는 폴백은 CSS 압축에서 앞의 값이 사라져 변수로 둔다)
 */
const viewportHeight = createVar()
const boardColumnFor = (allowance: number) => `minmax(0, min(640px, calc(${viewportHeight} - ${allowance}px)))`

/**
 * 뷰어: 보드 위(앱 헤더 + 대국 제목 ≈ 173px) + 보드 아래(간격 16 + 막대 48) + 여유 24 = 261px에서
 * 보드 열에 함께 든 평가 바 폭(바 + 간격 64px)을 빼면 197 → 200px.
 */
export const boardColumn = boardColumnFor(200)
/**
 * 분기 대국: 평가 바가 없고 보드 위에 차례 표시 줄이 더 있다.
 * 보드 위(앱 헤더 + 제목 + 차례 표시 ≈ 207px) + 보드 아래(간격 16 + 막대 48) + 여유 24 = 295 → 296px.
 */
export const playBoardColumn = boardColumnFor(296)

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
/**
 * 보드(stage)와 조작 막대를 묶는 왼쪽 열. md 이상에서 막대가 보드 바로 아래에 붙어,
 * 오른쪽 패널 높이가 수마다 달라져도 막대 위치가 바뀌지 않는다. (md 미만에서 막대는 화면 하단 고정)
 */
export const boardCol = style({
  display: 'grid',
  gap: space[4],
  alignContent: 'start',
  minWidth: 0,
  '@media': { [mq.md]: { gridColumn: 1 } },
})
export const stage = style({
  display: 'grid',
  gap: space[3],
  '@media': { [mq.md]: { gridTemplateColumns: 'auto minmax(0, 1fr)', alignItems: 'stretch' } },
})
export const boardWrap = style({ width: '100%', touchAction: 'pan-y' })
export const panel = style({
  display: 'grid',
  gap: space[4],
  alignContent: 'start',
  '@media': { [mq.md]: { gridColumn: 2 } },
})
export const note = style({ color: vars.color.muted, fontSize: fontSize.control })
export const reviewIdle = style({ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: space[3] })

export const player = style({ display: "inline-flex", flexWrap: "wrap", alignItems: "center", gap: space[2] })
export const side = style({ display: "inline-flex", alignItems: "center", whiteSpace: "nowrap", fontSize: fontSize.meta, color: vars.color.muted })
