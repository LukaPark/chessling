import { createVar, style } from '@vanilla-extract/css'
import { fontSize, mq, radius, space, vars, weight } from '../styles/tokens.css'

export const whiteRatio = createVar()

export const root = style({
  vars: { [whiteRatio]: '0.5' },
  display: 'flex',
  alignItems: 'center',
  gap: space[3],
  '@media': { [mq.md]: { flexDirection: 'column-reverse', height: '100%', gap: space[2] } },
})
export const track = style({
  display: 'flex',
  flex: 1,
  height: 12,
  overflow: 'hidden',
  borderRadius: radius.pill,
  background: vars.color.evalBlack,
  outline: `1px solid ${vars.color.line}`,
  selectors: { [`${root}[data-orientation="black"] &`]: { flexDirection: 'row-reverse' } },
  '@media': {
    [mq.md]: {
      width: 12,
      height: 'auto',
      alignSelf: 'center',
      flexDirection: 'column-reverse',
      selectors: { [`${root}[data-orientation="black"] &`]: { flexDirection: 'column' } },
    },
  },
})
export const fill = style({
  width: '100%',
  height: '100%',
  background: vars.color.evalWhite,
  transformOrigin: 'left center',
  transform: `scaleX(${whiteRatio})`,
  transition: 'transform 300ms cubic-bezier(.22,1,.36,1)',
  selectors: { [`${root}[data-orientation="black"] &`]: { transformOrigin: 'right center' } },
  '@media': {
    [mq.md]: {
      transformOrigin: 'center bottom',
      transform: `scaleY(${whiteRatio})`,
      selectors: { [`${root}[data-orientation="black"] &`]: { transformOrigin: 'center top' } },
    },
  },
})
export const label = style({
  minWidth: '3.4em',
  textAlign: 'right',
  fontSize: fontSize.meta,
  fontWeight: weight.medium,
  fontVariantNumeric: 'tabular-nums',
  '@media': { [mq.md]: { textAlign: 'center' } },
})
