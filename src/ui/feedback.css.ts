import { style, styleVariants } from '@vanilla-extract/css'
import { fontSize, radius, space, vars } from '../styles/tokens.css'

const box = style({
  display: 'flex',
  alignItems: 'flex-start',
  gap: space[2],
  padding: `${space[3]} ${space[4]}`,
  borderRadius: radius.action,
  background: vars.color.surfaceSubtle,
  fontSize: fontSize.control,
})
export const banner = styleVariants({
  info: [box, { color: vars.color.ink }],
  warn: [box, { color: vars.color.ink, background: vars.color.liveSurface }],
})
export const icon = style({ flexShrink: 0, marginTop: 2 })
export const error = style([box, { flexDirection: 'column', alignItems: 'flex-start', gap: space[3], padding: space[4] }])
export const errorHead = style({ display: 'flex', gap: space[2], alignItems: 'flex-start' })
