import { style } from '@vanilla-extract/css'
import { fontSize, mq, radius, space, vars, weight } from '../tokens.css'
import { playBoardColumn, stage as gameStage } from './gameLayout.css'

export const status = style({ display: 'inline-flex', alignItems: 'center', gap: space[2], fontSize: fontSize.lead, fontWeight: weight.medium })
export const turnDot = style({ width: 8, height: 8, borderRadius: 999, background: vars.color.accent })
export const dialogBody = style({ display: 'grid', gap: space[5] })
export const actions = style({ display: 'flex', justifyContent: 'flex-end', gap: space[2] })
export const elo = style({ display: 'grid', gap: space[2] })
export const eloValue = style({ fontSize: fontSize.section, fontWeight: weight.medium, fontVariantNumeric: 'tabular-nums' })
export const eloLabel = style({ color: vars.color.muted, fontSize: fontSize.meta })
export const range = style({ width: '100%', accentColor: vars.color.accent, height: 44 }) // 터치 영역 44px
export const original = style({ color: vars.color.muted, fontSize: fontSize.control })
export const forkActions = style({ gridArea: 'end', display: 'flex', gap: space[1] })

// 뷰어의 stage는 md부터 '평가 바 | 보드' 두 열이다. 분기 대국엔 평가 바가 없으니 한 열로 되돌린다.
// 보드 폭은 화면 높이 기준으로 줄이되, 보드 위에 차례 표시 줄이 더 있어 뷰어보다 많이 남긴다.
export const stage = style({
  selectors: { [`${gameStage}&`]: { '@media': { [mq.md]: { gridTemplateColumns: playBoardColumn } } } },
})

// 분기 대국의 수 평가 카드. 보드 아래(md 이상은 옆 열 맨 위)에 둔다.
// 평가 중 → 결과로 바뀌어도 높이가 흔들리지 않도록 판정 줄 + 코멘트 두 줄(1.6 × 2) 높이를 잡아 둔다.
export const evalCard = style({
  display: 'grid',
  alignContent: 'start',
  gap: space[1],
  minHeight: `calc(${space[3]} * 2 + ${fontSize.control} * 1.6 + ${space[1]} + ${fontSize.body} * 1.6 * 2)`,
  padding: `${space[3]} ${space[4]}`,
  borderRadius: radius.surface,
  background: vars.color.surfaceSubtle,
})
export const evalLine = style({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'baseline',
  columnGap: space[2],
  fontSize: fontSize.control,
  fontVariantNumeric: 'tabular-nums',
})
export const evalMove = style({ fontWeight: weight.medium })
export const evalLabel = style({ display: 'inline-flex', gap: space[1], fontWeight: weight.medium })
export const evalSep = style({ color: vars.color.muted })
export const evalMuted = style({ color: vars.color.muted })
