import { style } from '@vanilla-extract/css'
import { fontSize, mq, radius, space, vars, weight } from '../tokens.css'

export const home = style({ display: 'grid', rowGap: 88, paddingBottom: space[8], '@media': { [mq.md]: { rowGap: 144 } } })
export const hero = style({
  display: 'grid',
  justifyItems: 'center',
  alignContent: 'start',
  gap: space[5],
  minHeight: ['100vh', '100svh'],
  paddingTop: space[7],
  textAlign: 'center',
  '@media': { [mq.md]: { paddingTop: space[8], gap: space[6] } },
})
export const title = style({
  maxWidth: '12em',
  fontSize: "clamp(32px, 8vw, 48px)",
  lineHeight: 1.12,
  letterSpacing: '-0.02em',
  '@media': { [mq.md]: { fontSize: fontSize.displayMd }, [mq.lg]: { fontSize: fontSize.displayLg } },
})
export const titleLine = style({ display: "block", whiteSpace: "nowrap" })
export const lead = style({ maxWidth: '34rem', color: vars.color.muted, fontSize: fontSize.lead })
export const form = style({
  display: 'grid',
  gap: space[2],
  width: '100%',
  maxWidth: 560,
  justifyItems: 'stretch',
  '@media': { [mq.md]: { gridTemplateColumns: 'auto 1fr auto', alignItems: 'center' } },
})
export const platform = style({ justifySelf: 'center', '@media': { [mq.md]: { justifySelf: 'stretch' } } })
export const showcase = style({ display: 'grid', gap: space[3], width: '100%', maxWidth: 640, margin: `${space[5]} 0 0`, '@media': { [mq.md]: { marginTop: space[7] } } })
export const showcaseBoard = style({ width: '100%' })
export const tape = style({
  position: 'relative', // 안쪽 visuallyHidden(absolute)이 가로 스크롤 영역 밖으로 새지 않게
  display: 'flex',
  gap: space[2],
  minHeight: 32,
  overflowX: 'auto',
  listStyle: 'none',
  scrollbarWidth: 'none',
  whiteSpace: 'nowrap',
  fontSize: fontSize.control,
  fontVariantNumeric: 'tabular-nums',
  selectors: { '&::-webkit-scrollbar': { display: 'none' } },
})
export const tapeItem = style({ display: 'inline-flex', gap: 4, flexShrink: 0 })
export const tapeNo = style({ color: vars.color.muted })
export const caption = style({ color: vars.color.muted, fontSize: fontSize.meta })
export const controls = style({ display: 'flex', flexWrap: 'wrap', gap: space[2], justifyContent: 'center' })
export const story = style({ display: 'grid', gap: space[5], '@media': { [mq.md]: { gridTemplateColumns: '1fr auto', alignItems: 'end' } } })
export const storyTitle = style({ fontSize: fontSize.title, marginBottom: space[2] })
export const storyLink = style({ color: vars.color.ink, textDecoration: 'none', selectors: { '&:hover': { textDecoration: 'underline' } } })
export const actions = style({ display: 'flex', flexWrap: 'wrap', gap: space[2] })
export const cards = style({ display: 'grid', gap: space[3], listStyle: 'none', '@media': { [mq.md]: { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' } } })
export const cardLink = style({
  display: 'grid',
  gap: space[1],
  padding: space[4],
  borderRadius: radius.surface,
  background: vars.color.surfaceSubtle,
  color: vars.color.ink,
  textDecoration: 'none',
  selectors: { '&:hover': { background: vars.color.highlight } },
})
export const cardTitle = style({ fontWeight: weight.medium })
export const cardMeta = style({ color: vars.color.muted, fontSize: fontSize.meta })
