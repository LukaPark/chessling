import { style } from '@vanilla-extract/css'
import { fontSize, mq, radius, space, vars, weight } from '../tokens.css'

export const rows = style({ display: 'grid', gap: 2, listStyle: 'none' })
export const row = style({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  gridTemplateAreas: '"meta end" "main main"',
  columnGap: space[3],
  rowGap: 2,
  padding: space[3],
  margin: `0 calc(${space[3]} * -1)`,
  borderRadius: radius.action,
  color: vars.color.ink,
  textDecoration: 'none',
  selectors: {
    'a&:hover': { background: vars.color.surfaceSubtle },
    '&[aria-disabled="true"]': { color: vars.color.muted },
  },
  '@media': {
    [mq.md]: { gridTemplateColumns: '11rem minmax(0, 1fr) auto', gridTemplateAreas: '"meta main end"', alignItems: 'center' },
  },
})
export const rowMeta = style({ gridArea: 'meta', color: vars.color.muted, fontSize: fontSize.meta, fontVariantNumeric: 'tabular-nums' })
export const rowMain = style({ gridArea: 'main', minWidth: 0, fontSize: fontSize.body, fontWeight: weight.medium })
export const rowEnd = style({ gridArea: 'end', justifySelf: 'end', display: 'flex', alignItems: 'center', gap: space[2], fontVariantNumeric: 'tabular-nums' })
export const toolbar = style({ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: space[3] })
export const monthNav = style({ display: 'flex', alignItems: 'center', gap: space[1] })
export const monthLabel = style({ minWidth: '7.5em', textAlign: 'center', fontWeight: weight.medium })
export const tourRow = style([
  row,
  {
    gridTemplateAreas: '"main end" "meta meta"',
    '@media': { [mq.md]: { gridTemplateColumns: 'minmax(0, 1fr) auto', gridTemplateAreas: '"main meta"' } },
  },
])
export const tourName = style({
  gridArea: 'main',
  display: 'inline-flex',
  alignItems: 'center',
  gap: space[2],
  minWidth: 0,
  selectors: { '[data-highlight="true"] &': { fontWeight: weight.medium } },
})
export const tourDot = style({ width: 7, height: 7, flexShrink: 0, borderRadius: radius.pill, background: vars.color.accent })
export const classicGrid = style({ display: 'grid', gap: space[3], listStyle: 'none', '@media': { [mq.md]: { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' } } })
export const classicItem = style({ display: 'grid', gap: space[2], alignContent: 'start', padding: space[5], borderRadius: radius.surface, background: vars.color.surfaceSubtle })
export const classicYear = style({ fontSize: fontSize.section, lineHeight: 1, color: vars.color.muted, fontVariantNumeric: 'tabular-nums' })
export const classicTitle = style({ fontSize: fontSize.title })
export const classicLink = style({ color: vars.color.ink, textDecoration: 'none', selectors: { '&:hover': { textDecoration: 'underline' } } })
export const clamp = style({ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', color: vars.color.muted })
