import { style } from '@vanilla-extract/css'
import { radius, vars } from '../styles/tokens.css'

export const frame = style({ transformOrigin: 'left center' })
export const svg = style({ display: 'block', width: '100%', height: 88, borderRadius: radius.action, background: vars.color.surfaceSubtle, cursor: 'pointer' })
export const area = style({ fill: vars.color.muted, fillOpacity: 0.35 })
export const mid = style({ stroke: vars.color.line, strokeWidth: 1, strokeDasharray: '4 4' })
export const cursor = style({ stroke: vars.color.accent, strokeWidth: 2 })
