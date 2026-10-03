import { epdOf, sanLineToUci } from './line'
import type { OpeningEntry } from './types'

export function buildIndex(rows: { eco: string; name: string; pgn: string }[]): { entries: OpeningEntry[]; conflicts: string[] } {
  const byEpd = new Map<string, OpeningEntry>()
  const conflicts: string[] = []
  for (const row of rows) {
    let line
    try {
      line = sanLineToUci(row.pgn)
    } catch (e) {
      throw new Error(`${row.name}: ${(e as Error).message}`)
    }
    const entry: OpeningEntry = { eco: row.eco, name: row.name, uci: line.uci, epd: epdOf(line.fens.at(-1)!) }
    const prev = byEpd.get(entry.epd)
    if (!prev) {
      byEpd.set(entry.epd, entry)
    } else if (entry.uci.length > prev.uci.length) {
      conflicts.push(`${prev.name} → ${entry.name}`)
      byEpd.set(entry.epd, entry)
    } else {
      conflicts.push(`${entry.name} → ${prev.name}`)
    }
  }
  return { entries: [...byEpd.values()], conflicts }
}
