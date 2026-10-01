import { keyframes, style, styleVariants } from '@vanilla-extract/css'
import { fontSize, mq, radius, space, vars } from '../styles/tokens.css'

const rise = keyframes({ from: { transform: 'translateY(24px)', opacity: 0 }, to: { transform: 'none', opacity: 1 } })
const fade = keyframes({ from: { opacity: 0 }, to: { opacity: 1 } })

const base = style({
  padding: 0,
  border: 0,
  color: vars.color.ink,
  background: vars.color.surface,
  maxHeight: '85svh',
  overflow: 'auto',
  selectors: { '&::backdrop': { background: 'rgb(9 12 16 / 0.45)', backdropFilter: 'blur(4px)', animation: `${fade} 250ms ease` } },
})
export const dialog = styleVariants({
  center: [base, { width: 'min(440px, calc(100% - 40px))', borderRadius: radius.surface, animation: `${fade} 250ms ease` }],
  sheet: [
    base,
    {
      width: '100%',
      maxWidth: '100%',
      margin: 'auto 0 0',
      borderRadius: `${radius.surface} ${radius.surface} 0 0`,
      animation: `${rise} 250ms cubic-bezier(.22,1,.36,1)`,
      '@media': {
        [mq.md]: { width: 'min(520px, calc(100% - 48px))', margin: 'auto', borderRadius: radius.surface, animation: `${fade} 250ms ease` },
      },
    },
  ],
})
export const panel = style({ display: 'grid', gap: space[4], padding: space[5] })
export const sheetPanel = style({ paddingBottom: `calc(${space[5]} + env(safe-area-inset-bottom))` })
export const head = style({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: space[2] })
export const title = style({ fontSize: fontSize.title })
