import { DEFAULT_POSITION } from 'chess.js'
import { moveNumberOf } from '../chess/moveNumber'
import { pvToSan } from '../chess/pgn'
import type { Ply } from '../chess/types'
import { sanLineToUci } from './line'
import type { OpeningAt, OpeningTrack } from './types'

export function openingLabel(at: OpeningAt): string {
  const [, ...rest] = at.entry.name.split(':')
  const variationEn = rest.join(':').trim()
  if (!at.family) return `${at.entry.eco} · ${at.entry.name}`
  const head = at.variation ? `${at.family.name}: ${at.variation.name}` : at.family.name
  return variationEn ? `${at.entry.eco} · ${head} · ${variationEn}` : `${at.entry.eco} · ${head}`
}

export interface CardOpening {
  label: string
  /** 이 수에서 오프닝 이름이 바뀌었다 */
  changed: boolean
  summary: string | null
  /** "이론대로라면 6.Be3 또는 6.h3" */
  deviation: string | null
}

export function cardOpening(track: OpeningTrack, plies: Ply[], ply: number): CardOpening | null {
  const at = track.byPly[ply]
  if (!at) return null
  const changed = at.ply === ply
  let deviation: string | null = null
  if (track.deviation?.ply === ply) {
    const { number, white } = moveNumberOf(plies[0].fen, ply)
    const prefix = `${number}${white ? '.' : '...'}`
    const sans = track.deviation.theory.map((u) => `${prefix}${pvToSan(plies[ply - 1].fen, [u], 1)[0]}`)
    deviation = `이론대로라면 ${sans.join(' 또는 ')}`
  }
  return {
    label: openingLabel(at),
    changed,
    summary: changed ? (at.variation?.summary ?? at.family?.idea ?? null) : null,
    deviation,
  }
}

/** 연습에 쓸 대표 수순: 한국어 데이터의 line, 없으면 색인의 수순 */
export function practiceLine(at: OpeningAt): { san: string[]; uci: string[]; endFen: string } {
  const uci = at.variation ? sanLineToUci(at.variation.line).uci : at.entry.uci
  const san = pvToSan(DEFAULT_POSITION, uci, uci.length)
  const { fens } = sanLineToUci(san.join(' '))
  return { san, uci, endFen: fens.at(-1) ?? DEFAULT_POSITION }
}

export function compareLine(lineUci: string[], plies: Ply[]): number {
  let n = 0
  while (n < lineUci.length && plies[n + 1]?.uci === lineUci[n]) n++
  return n
}
