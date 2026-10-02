import type { Square } from 'chess.js'
import type { GuideKind, GuideShape } from '../engine/comment/guide'

/** "d3h7" 초록 화살표, "h7" 빨간 원, "!d3h7" 빨간 화살표, "?e2e4" 파란 화살표(놓친 수) */
const TOKEN = /^([!?]?)([a-h][1-8])([a-h][1-8])?$/

export function parseGuideToken(token: string): GuideShape | null {
  const m = TOKEN.exec(token)
  if (!m) return null
  const [, mark, a, b] = m
  if (!b) return mark ? null : { kind: 'danger', to: a as Square }
  const kind: GuideKind = mark === '!' ? 'danger' : mark === '?' ? 'missed' : 'attack'
  return { kind, from: a as Square, to: b as Square }
}

export function parseGuide(list: string[]): GuideShape[] {
  return list.map(parseGuideToken).filter((g): g is GuideShape => g !== null)
}

export function guideToken(g: GuideShape): string {
  if (!g.from) return g.to
  const mark = g.kind === 'danger' ? '!' : g.kind === 'missed' ? '?' : ''
  return `${mark}${g.from}${g.to}`
}
