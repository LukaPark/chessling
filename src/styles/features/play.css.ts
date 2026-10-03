import { style } from '@vanilla-extract/css'
import { fontSize, mq, radius, space, vars, weight } from '../tokens.css'
import { boardColumn, stage as gameStage } from './gameLayout.css'

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
// 보드 폭은 뷰어와 같은 상한(화면 높이 기준)을 둔다.
export const stage = style({
  selectors: { [`${gameStage}&`]: { '@media': { [mq.md]: { gridTemplateColumns: boardColumn } } } },
})

// 분기 대국의 수 평가 카드. 뷰어 판정 카드보다 얇게, 상태 줄 바로 아래에 둔다.
export const evalCard = style({
  display: 'grid',
  gap: space[1],
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
