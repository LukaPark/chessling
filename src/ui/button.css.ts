import { keyframes, style } from '@vanilla-extract/css'
import { recipe, type RecipeVariants } from '@vanilla-extract/recipes'
import { fontSize, mq, radius, vars, weight } from '../styles/tokens.css'

const rotate = keyframes({ to: { transform: 'rotate(360deg)' } })
export const spin = style({
  animation: `${rotate} 1s linear infinite`,
  '@media': { '(prefers-reduced-motion: reduce)': { animation: 'none' } },
})

export const button = recipe({
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 44,
    paddingInline: 18,
    border: 0,
    borderRadius: radius.action,
    fontSize: fontSize.control,
    fontWeight: weight.regular,
    lineHeight: 1.2,
    textDecoration: 'none',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'background-color 160ms ease, color 160ms ease',
    selectors: { '&:disabled, &[aria-disabled="true"]': { opacity: 0.5, cursor: 'not-allowed' } },
    '@media': { [mq.md]: { minHeight: 48, paddingInline: 22, borderRadius: radius.actionMd } },
  },
  variants: {
    tone: {
      primary: {
        background: vars.color.accent,
        color: vars.color.onAccent,
        selectors: { '&:hover:not(:disabled)': { background: vars.color.accentHover } },
      },
      secondary: { background: vars.color.surfaceSubtle, color: vars.color.ink },
      ghost: {
        background: 'transparent',
        color: vars.color.ink,
        selectors: { '&:hover:not(:disabled)': { background: vars.color.surfaceSubtle } },
      },
    },
    size: {
      md: {},
      sm: { minHeight: 44, paddingInline: 14, fontSize: '14px', '@media': { [mq.md]: { minHeight: 44, paddingInline: 16 } } },
    },
  },
  defaultVariants: { tone: 'primary', size: 'md' },
})
export type ButtonVariants = NonNullable<RecipeVariants<typeof button>>

export const iconButton = style({
  display: 'inline-grid',
  placeItems: 'center',
  flexShrink: 0,
  width: 44,
  height: 44,
  padding: 0,
  border: 0,
  borderRadius: radius.action,
  background: 'transparent',
  color: vars.color.ink,
  cursor: 'pointer',
  textDecoration: 'none',
  selectors: {
    '&:hover:not(:disabled)': { background: vars.color.surfaceSubtle },
    '&[aria-pressed="true"], &[aria-current="page"]': { background: vars.color.surfaceSubtle, color: vars.color.accent },
    '&:disabled': { opacity: 0.4, cursor: 'not-allowed' },
  },
})
