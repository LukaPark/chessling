import { normalizeResult, parseHeaders } from '../chess/pgn'
import type { GameRecord, Player } from '../chess/types'
import { getJson, getText } from './http'
import { LICHESS } from './lichess'

export interface BroadcastTour {
  id: string
  name: string
  slug: string
  dates?: number[]
  tier?: number
  image?: string
}
export interface BroadcastRound {
  id: string
  name: string
  startsAt?: number
  finished?: boolean
  ongoing?: boolean
}
export interface BroadcastTourDetail {
  tour: BroadcastTour
  rounds: BroadcastRound[]
  defaultRoundId?: string
}
interface Entry {
  tour: BroadcastTour
}

export async function listTopBroadcasts(signal?: AbortSignal): Promise<{ active: BroadcastTour[]; past: BroadcastTour[] }> {
  const d = await getJson<{ active: Entry[]; past: { currentPageResults: Entry[] } }>(`${LICHESS}/api/broadcast/top`, { signal })
  return { active: d.active.map((e) => e.tour), past: d.past.currentPageResults.map((e) => e.tour) }
}

export async function searchBroadcasts(q: string, signal?: AbortSignal): Promise<BroadcastTour[]> {
  const d = await getJson<{ currentPageResults: Entry[] }>(
    `${LICHESS}/api/broadcast/search?q=${encodeURIComponent(q)}`,
    { signal },
  )
  return d.currentPageResults.map((e) => e.tour)
}

export function getBroadcastTour(id: string, signal?: AbortSignal): Promise<BroadcastTourDetail> {
  return getJson<BroadcastTourDetail>(`${LICHESS}/api/broadcast/${encodeURIComponent(id)}`, { signal })
}

export async function getRoundGames(roundId: string, signal?: AbortSignal): Promise<GameRecord[]> {
  const text = await getText(`${LICHESS}/api/broadcast/round/${encodeURIComponent(roundId)}.pgn`, { signal })
  return splitPgn(text).map((pgn, i) => broadcastPgnToRecord(roundId, pgn, i))
}

export function splitPgn(text: string): string[] {
  return text
    .split(/\r?\n\s*\r?\n(?=\[)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

const HIGHLIGHT = /olympiad|world championship|candidates/i

export function isHighlighted(tour: BroadcastTour): boolean {
  return HIGHLIGHT.test(tour.name)
}

function broadcastPgnToRecord(roundId: string, pgn: string, index: number): GameRecord {
  const h = parseHeaders(pgn)
  const gameId = h.GameURL?.split('/').pop() || `g${index}`
  return {
    ref: { kind: 'broadcast', roundId, gameId },
    white: toPlayer(h.White, h.WhiteElo, h.WhiteTitle),
    black: toPlayer(h.Black, h.BlackElo, h.BlackTitle),
    result: normalizeResult(h.Result),
    date: (h.Date ?? '').replace(/\./g, '-'),
    speed: 'unknown',
    timeControl: h.TimeControl,
    variant: (h.Variant ?? 'Standard').toLowerCase() === 'standard' ? 'standard' : 'other',
    event: h.Event,
    pgn,
  }
}

function toPlayer(name = '?', elo?: string, title?: string): Player {
  const rating = Number(elo)
  return { name, rating: rating > 0 ? rating : undefined, title: title || undefined }
}
