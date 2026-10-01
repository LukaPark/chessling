import { style } from '@vanilla-extract/css'
import { fontSize, vars, weight } from '../styles/tokens.css'

export const list = style({ display: 'flex', flexWrap: 'wrap', gap: '2px 6px', listStyle: 'none' })
export const item = style({ display: 'inline-flex', alignItems: 'center', gap: 2 })
export const number = style({ color: vars.color.muted, fontSize: fontSize.meta, fontVariantNumeric: 'tabular-nums' })
export const move = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 2,
  minHeight: 32,
  paddingInline: 6,
  border: 0,
  borderRadius: 8,
  background: 'transparent',
  color: vars.color.ink,
  fontSize: fontSize.control,
  cursor: 'pointer',
  position: 'relative',
  selectors: {
    '&::after': { content: '""', position: 'absolute', inset: '-6px -2px' },
    '&:hover': { background: vars.color.surface },
    '&[aria-current="step"]': { background: vars.color.surface, fontWeight: weight.medium },
  },
})
/** onSelect가 없을 때: 누를 수 없는 수 */
export const readonly = style({
  cursor: 'default',
  selectors: {
    '&:hover': { background: 'transparent' },
    '&[aria-current="step"]': { background: vars.color.surface },
  },
})
export const glyph = style({ fontWeight: weight.medium, fontSize: fontSize.meta })
