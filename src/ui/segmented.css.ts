import { style } from '@vanilla-extract/css'
import { fontSize, mq, radius, vars } from '../styles/tokens.css'

export const root = style({
  display: 'inline-flex',
  flexWrap: 'wrap',
  gap: 4,
  margin: 0,
  padding: 4,
  border: 0,
  borderRadius: radius.action,
  background: vars.color.surfaceSubtle,
  '@media': { [mq.md]: { borderRadius: radius.actionMd } },
})
export const option = style({
  position: 'relative',
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: 44,
  paddingInline: 14,
  borderRadius: 9,
  color: vars.color.muted,
  fontSize: fontSize.control,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  selectors: {
    '&:has(input:checked)': { background: vars.color.surface, color: vars.color.ink },
    '&:has(input:focus-visible)': { outline: `3px solid ${vars.color.accent}`, outlineOffset: 1 },
  },
})
export const input = style({ position: 'absolute', inset: 0, margin: 0, opacity: 0, cursor: 'pointer' })
