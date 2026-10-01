import { style } from '@vanilla-extract/css'
import { fontSize, mq, radius, space, vars } from '../styles/tokens.css'

export const bar = style({
  position: 'fixed',
  insetInline: 0,
  bottom: 0,
  zIndex: 20,
  display: 'flex',
  justifyContent: 'space-around',
  alignItems: 'center',
  gap: space[1],
  padding: `${space[2]} ${space[2]} calc(${space[2]} + env(safe-area-inset-bottom))`,
  background: vars.color.surfaceSubtle,
  '@media': {
    [mq.md]: { position: 'static', justifyContent: 'flex-start', padding: 0, background: 'transparent', gap: space[2] },
  },
})

export const item = style({
  display: 'grid',
  placeItems: 'center',
  alignContent: 'center',
  gap: 2,
  flex: '1 1 0',
  minWidth: 44,
  minHeight: 48,
  paddingInline: space[1],
  border: 0,
  borderRadius: radius.action,
  background: 'transparent',
  color: vars.color.ink,
  cursor: 'pointer',
  fontSize: fontSize.control,
  fontVariantNumeric: 'tabular-nums',
  selectors: {
    '&:hover:not(:disabled)': { background: vars.color.surface },
    '&[aria-pressed="true"]': { background: vars.color.surface, color: vars.color.accent },
    '&:disabled': { opacity: 0.35, cursor: 'not-allowed' },
  },
  '@media': {
    [mq.md]: {
      flex: '0 0 auto',
      minWidth: 48,
      selectors: {
        '&:hover:not(:disabled)': { background: vars.color.surfaceSubtle },
        '&[aria-pressed="true"]': { background: vars.color.surfaceSubtle },
      },
    },
  },
})

export const caption = style({ fontSize: '12px', color: vars.color.muted, lineHeight: 1.2 })

// "18 / 33" 같은 숫자 버튼은 줄바꿈 없이 조금 더 넓게.
export const counter = style({ flexGrow: 1.6, whiteSpace: 'nowrap' })
