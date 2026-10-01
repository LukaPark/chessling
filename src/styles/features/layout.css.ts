import { style } from '@vanilla-extract/css'
import { fontSize, layout, mq, radius, space, vars, weight } from '../tokens.css'

export const shell = style({ minHeight: '100svh', display: 'flex', flexDirection: 'column' })
export const skip = style({
  position: 'absolute',
  left: space[4],
  top: -60,
  zIndex: 50,
  padding: `${space[2]} ${space[4]}`,
  borderRadius: radius.action,
  background: vars.color.accent,
  color: vars.color.onAccent,
  textDecoration: 'none',
  selectors: { '&:focus-visible': { top: space[2] } },
})
export const header = style({
  position: 'sticky',
  top: 0,
  zIndex: 30,
  width: '100%',
  background: vars.color.canvas,
})
export const headerInner = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: space[2],
  maxWidth: layout.headerMax,
  height: 52,
  margin: '0 auto',
  paddingInline: layout.gutter,
  '@media': { [mq.md]: { height: 60, paddingInline: layout.gutterMd } },
})
export const wordmark = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 3,
  color: vars.color.ink,
  fontSize: '18px',
  fontWeight: weight.medium,
  letterSpacing: '-0.01em',
  textDecoration: 'none',
  '@media': { [mq.md]: { fontSize: fontSize.title } },
})
export const dot = style({ width: 7, height: 7, borderRadius: radius.pill, background: vars.color.accent, marginTop: 6 })
export const nav = style({ display: 'flex', alignItems: 'center', gap: 0, '@media': { [mq.md]: { gap: space[1] } } })
export const navLink = style({
  display: 'inline-flex',
  alignItems: 'center',
  height: 32,
  paddingInline: 6,
  borderRadius: 8,
  color: vars.color.muted,
  fontSize: fontSize.control,
  textDecoration: 'none',
  whiteSpace: 'nowrap',
  selectors: { '&:hover': { background: vars.color.surfaceSubtle, color: vars.color.ink } },
  '@media': { [mq.md]: { paddingInline: 12 } },
})
export const navActive = style({ color: vars.color.ink })
export const themeSlot = style({ display: 'none', '@media': { [mq.md]: { display: 'inline-flex' } } })
export const themeIcon = style({ display: 'inline-grid', placeItems: 'center' })
export const github = style({ display: 'none', color: vars.color.ink, '@media': { [mq.md]: { display: 'inline-flex' } } })
export const main = style({
  flex: 1,
  width: '100%',
  maxWidth: layout.maxWidth,
  margin: '0 auto',
  paddingInline: layout.gutter,
  paddingTop: space[4],
  outline: 'none',
  '@media': { [mq.md]: { paddingInline: layout.gutterMd, paddingTop: space[5] } },
})
export const bannerSlot = style({ marginBottom: space[4] })
export const footer = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: space[3],
  width: '100%',
  maxWidth: layout.maxWidth,
  margin: '0 auto',
  padding: `${space[8]} ${layout.gutter} ${space[6]}`,
  color: vars.color.muted,
  fontSize: fontSize.meta,
  '@media': { [mq.md]: { paddingInline: layout.gutterMd } },
})
export const footerLink = style({ display: 'inline-flex', alignItems: 'center', minHeight: 44, color: vars.color.muted }) // 터치 영역 44px
