import { style } from '@vanilla-extract/css'
import { fontSize, radius, space, vars, weight } from '../styles/tokens.css'

export const root = style({ background: vars.color.surfaceSubtle, borderRadius: radius.surface })
export const trigger = style({
  display: 'flex',
  width: '100%',
  alignItems: 'center',
  justifyContent: 'space-between',
  minHeight: 52,
  padding: `0 ${space[4]}`,
  border: 0,
  borderRadius: radius.surface,
  background: 'transparent',
  color: vars.color.ink,
  fontSize: fontSize.control,
  fontWeight: weight.medium,
  cursor: 'pointer',
})
export const chevron = style({ transition: 'transform 250ms ease', color: vars.color.muted })
export const chevronOpen = style([chevron, { transform: 'rotate(180deg)' }])
export const content = style({ overflow: 'hidden' })
export const inner = style({ padding: `0 ${space[4]} ${space[4]}` })
