import { Chess } from 'chess.js'
import type { Ply } from '../chess/types'
import { epdOf, START_EPD } from './line'
import type { KoOpenings, OpeningAt, OpeningData, OpeningEntry, OpeningTrack } from './types'

const MAX_THEORY = 3

export function buildLookup(index: OpeningEntry[]): Map<string, OpeningEntry> {
  return new Map(index.map((e) => [e.epd, e]))
}

function describe(ply: number, entry: OpeningEntry, ko: KoOpenings): OpeningAt {
  const family = ko.families[entry.name.split(':')[0]] ?? null
  let variationKey: string | null = null
  for (const key of Object.keys(ko.variations)) {
    const hit = entry.name === key || entry.name.startsWith(`${key},`)
    if (hit && (variationKey === null || key.length > variationKey.length)) variationKey = key
  }
  return { ply, entry, family, variation: variationKey ? ko.variations[variationKey] : null, variationKey }
}

/** 이 포지션에서 한 수를 두어 색인에 닿는 수들(수순이 짧은 순, 같으면 이름순) */
export function theoryMoves(fen: string, lookup: Map<string, OpeningEntry>): string[] {
  return new Chess(fen)
    .moves({ verbose: true })
    .map((m) => ({ uci: m.from + m.to + (m.promotion ?? ''), entry: lookup.get(epdOf(m.after)) }))
    .filter((x): x is { uci: string; entry: OpeningEntry } => x.entry !== undefined)
    .sort((a, b) => a.entry.uci.length - b.entry.uci.length || a.entry.name.localeCompare(b.entry.name))
    .slice(0, MAX_THEORY)
    .map((x) => x.uci)
}

export function identifyOpening(plies: Ply[], data: OpeningData, lookup = buildLookup(data.index)): OpeningTrack | null {
  if (epdOf(plies[0].fen) !== START_EPD) return null
  const byPly: (OpeningAt | null)[] = [null]
  let current: OpeningAt | null = null
  let lastMatched = 0
  for (let i = 1; i < plies.length; i++) {
    const entry = lookup.get(epdOf(plies[i].fen))
    if (entry) {
      // 이름이 그대로면 배지를 다시 달지 않도록 처음 맞은 수는 유지하고, 항목(ECO·수순)은 최신으로 바꾼다
      current = current && entry.name === current.entry.name ? { ...describe(i, entry, data.ko), ply: current.ply } : describe(i, entry, data.ko)
      lastMatched = i
    }
    byPly.push(current)
  }
  let deviation: OpeningTrack['deviation'] = null
  if (lastMatched < plies.length - 1) {
    const theory = theoryMoves(plies[lastMatched].fen, lookup)
    if (theory.length > 0) deviation = { ply: lastMatched + 1, theory }
  }
  return { byPly, deviation }
}
