import { globalStyle, style } from '@vanilla-extract/css'
import { fontSize, radius, vars } from '../styles/tokens.css'

export const field = style({ display: 'grid', gap: 6, minWidth: 0 })
export const label = style({ fontSize: fontSize.meta, color: vars.color.muted })
export const control = style({
  width: '100%',
  height: 48,
  paddingInline: 14,
  border: `1px solid ${vars.color.line}`,
  borderRadius: radius.action,
  background: vars.color.surface,
  color: vars.color.ink,
  fontSize: '16px',
  outline: 'none',
  selectors: {
    '&:focus-visible': { borderColor: vars.color.accent, outline: `3px solid ${vars.color.accent}`, outlineOffset: 0 },
    '&::placeholder': { color: vars.color.muted },
  },
})
export const selectWrap = style({ position: 'relative' })
export const select = style([control, { appearance: 'none', paddingRight: 40, cursor: 'pointer', selectors: { '&:focus': { background: vars.color.surfaceSubtle, borderColor: vars.color.accent }, '&:disabled': { opacity: 0.5, cursor: 'not-allowed' } } }])
export const chevron = style({ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: vars.color.muted })

globalStyle(`${select} option`, { background: vars.color.surface, color: vars.color.ink, fontSize: '16px' })
globalStyle(`html[data-theme="dark"] ${select}`, { colorScheme: 'dark' })
globalStyle(`html[data-theme="light"] ${select}`, { colorScheme: 'light' })
