import { style, styleVariants } from '@vanilla-extract/css'
import { fontSize, radius, vars, weight } from '../styles/tokens.css'

const base = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  minHeight: 24,
  paddingInline: 10,
  borderRadius: radius.pill,
  fontSize: fontSize.meta,
  fontWeight: weight.medium,
  whiteSpace: 'nowrap',
})
export const badge = styleVariants({
  win: [base, { background: `color-mix(in srgb, ${vars.color.judgment.best} 12%, ${vars.color.surface})`, color: vars.color.judgment.best }],
  loss: [base, { background: `color-mix(in srgb, ${vars.color.judgment.blunder} 12%, ${vars.color.surface})`, color: vars.color.judgment.blunder }],
  draw: [base, { background: `color-mix(in srgb, ${vars.color.accent} 12%, ${vars.color.surface})`, color: vars.color.accent }],
  neutral: [base, { background: vars.color.surfaceSubtle, color: vars.color.muted }],
  live: [base, { background: vars.color.liveSurface, color: vars.color.live }],
})
export const dot = style({ width: 6, height: 6, borderRadius: radius.pill, background: 'currentColor' })
