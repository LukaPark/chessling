import { style } from '@vanilla-extract/css'
import { vars } from '../styles/tokens.css'

export const root = style({ display: 'inline' })
export const char = style({ position: 'relative', display: 'inline-block', whiteSpace: 'pre' })
export const ink = style({ color: 'inherit' })
export const glow = style({
  position: 'absolute',
  inset: 0,
  backgroundImage: `linear-gradient(90deg, ${vars.color.accent}, #1fb5c9, #7b5cff)`,
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
  '@media': { '(forced-colors: active)': { display: 'none' } },
})
