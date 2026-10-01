import { style } from '@vanilla-extract/css'
import { fontSize, mq, space, vars } from '../styles/tokens.css'

export const section = style({ display: 'grid', gap: space[5], '@media': { [mq.md]: { gap: space[6] } } })
export const head = style({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'flex-end',
  justifyContent: 'space-between',
  gap: space[3],
})
export const title = style({ fontSize: fontSize.section, '@media': { [mq.md]: { fontSize: fontSize.sectionMd } } })
export const description = style({ color: vars.color.muted, maxWidth: '34rem' })
