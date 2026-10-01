import { style } from '@vanilla-extract/css'
import { fontSize, mq, space, vars } from '../tokens.css'

export const page = style({ display: 'grid', gap: space[6], paddingBottom: space[7], '@media': { [mq.md]: { gap: space[7] } } })
export const pageHead = style({ display: 'grid', gap: space[2] })
export const pageTitle = style({ fontSize: fontSize.section, '@media': { [mq.md]: { fontSize: fontSize.sectionMd } } })
export const lead = style({ color: vars.color.muted, fontSize: fontSize.lead })
export const meta = style({ color: vars.color.muted, fontSize: fontSize.meta })
export const reading = style({ display: 'grid', gap: space[4], maxWidth: 640 })
export const list = style({ display: 'grid', gap: space[2], paddingLeft: '1.2em' })
export const bigNumber = style({ fontSize: fontSize.displayMd, color: vars.color.muted, lineHeight: 1 })
