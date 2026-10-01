import { style } from '@vanilla-extract/css'
import { fontSize, mq, radius, space, vars, weight } from '../tokens.css'

export const card = style({
  display: 'grid',
  gap: space[2],
  minHeight: 112,
  padding: space[4],
  borderRadius: radius.surface,
  background: vars.color.surfaceSubtle,
  alignContent: 'start',
})
export const move = style({ fontSize: fontSize.title, fontWeight: weight.medium, fontVariantNumeric: 'tabular-nums' })
export const judgment = style({ display: 'inline-flex', alignItems: 'center', justifySelf: 'start', padding: '6px 12px', borderRadius: 999, background: 'color-mix(in srgb, currentColor 12%, transparent)', gap: space[2], fontSize: fontSize.lead, fontWeight: weight.medium })
export const glyph = style({ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 32, height: 32, borderRadius: '50%', background: 'color-mix(in srgb, currentColor 16%, transparent)', fontSize: fontSize.lead })
export const detail = style({ color: vars.color.muted, fontSize: fontSize.control, fontVariantNumeric: 'tabular-nums' })
export const hint = style({ display: 'inline-flex', alignItems: 'center', gap: space[2], color: vars.color.accent, fontSize: fontSize.control, fontWeight: weight.medium })
export const summary = style({ display: 'grid', gap: space[3] })
export const accuracy = style({ display: 'flex', flexWrap: 'wrap', alignItems: 'end', gap: `${space[3]} ${space[6]}` })
export const accuracyItem = style({ display: 'grid', gap: space[1] })
export const accuracyLabel = style({ color: vars.color.muted, fontSize: fontSize.control })
export const accuracyValue = style({
  fontSize: fontSize.section,
  fontWeight: weight.medium,
  fontVariantNumeric: 'tabular-nums',
  lineHeight: 1.1,
  '@media': { [mq.md]: { fontSize: fontSize.sectionMd } },
})
export const table = style({ width: '100%', borderCollapse: 'collapse', fontSize: fontSize.control, fontVariantNumeric: 'tabular-nums' })
export const th = style({ textAlign: 'left', fontWeight: weight.regular, padding: `${space[1]} 0` })
export const td = style({ textAlign: 'right', padding: `${space[1]} 0`, width: '4em' })

export const comment = style({ display: 'grid', gap: space[1], justifyItems: 'start' })
export const commentText = style({ fontSize: fontSize.body, lineHeight: 1.6, color: vars.color.ink, wordBreak: 'keep-all', overflowWrap: 'anywhere' })
export const commentClamped = style({ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' })
export const variation = style({ color: vars.color.muted, fontVariantNumeric: 'tabular-nums', whiteSpace: 'normal', wordBreak: 'keep-all' })
export const moreButton = style({
  minHeight: 44,
  minWidth: 44,
  padding: `0 ${space[1]}`,
  border: 0,
  background: 'transparent',
  color: vars.color.accent,
  fontSize: fontSize.control,
  fontWeight: weight.medium,
  cursor: 'pointer',
})
