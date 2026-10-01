import { style } from '@vanilla-extract/css'
import { fontSize, vars, weight } from '../styles/tokens.css'

export const list = style({ display: 'grid', gap: 8, listStyle: 'none' })
export const line = style({ display: 'flex', gap: 12, alignItems: 'baseline', fontSize: fontSize.control, minWidth: 0 })
export const score = style({ flexShrink: 0, minWidth: '4.2em', fontWeight: weight.medium, fontVariantNumeric: 'tabular-nums' })
export const pv = style({ color: vars.color.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })
