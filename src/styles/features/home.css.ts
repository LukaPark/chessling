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
// 검색 폼 아래 최근 검색 칩. 좁은 화면에서는 줄을 바꿔 가로 스크롤이 생기지 않게 한다.
export const recent = style({
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'center',
  alignItems: 'center',
  gap: space[2],
  width: '100%',
  maxWidth: 560,
  // 긴 아이디가 히어로 열 폭을 넓히지 않도록 안쪽 내용의 폭을 바깥 크기 계산에서 뺀다(칩은 말줄임)
  contain: 'inline-size',
})
export const recentLabel = style({ color: vars.color.muted, fontSize: fontSize.meta })
export const recentList = style({ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: space[2], minWidth: 0, maxWidth: '100%', listStyle: 'none' })
export const chip = style({
  display: 'inline-flex',
  alignItems: 'center',
  minWidth: 0,
  maxWidth: '100%',
  minHeight: 44,
  borderRadius: radius.pill,
  background: vars.color.surfaceSubtle,
})
export const chipLink = style({
  display: 'inline-flex',
  alignItems: 'center',
  minWidth: 0,
  minHeight: 44,
  paddingInlineStart: space[4],
  borderRadius: radius.pill,
  color: vars.color.ink,
  fontSize: fontSize.control,
  textDecoration: 'none',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  selectors: { '&:hover': { textDecoration: 'underline' } },
})
export const chipRemove = style({
  display: 'inline-grid',
  placeItems: 'center',
  flexShrink: 0,
  width: 44,
  height: 44,
  padding: 0,
  border: 0,
  borderRadius: radius.pill,
  background: 'transparent',
  color: vars.color.muted,
  cursor: 'pointer',
  selectors: { '&:hover': { color: vars.color.ink, background: vars.color.highlight } },
})
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
