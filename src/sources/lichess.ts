import { koreanDate } from '../chess/date'
import type { GameRecord, GameSummary, Player, Result, Speed } from '../chess/types'
import { getJson, request } from './http'
import { readNdjson } from './ndjson'

export const LICHESS = 'https://lichess.org'

export interface LichessPlayerJson {
  user?: { name: string; title?: string }
  rating?: number
  aiLevel?: number
}
export interface LichessGameJson {
  id: string
  variant: string
  speed: string
  createdAt: number
  status: string
  players: { white: LichessPlayerJson; black: LichessPlayerJson }
  winner?: 'white' | 'black'
  clock?: { initial: number; increment: number }
  pgn?: string
}

const UNFINISHED = new Set(['created', 'started', 'aborted', 'noStart'])
const SPEEDS: Speed[] = ['ultraBullet', 'bullet', 'blitz', 'rapid', 'classical', 'correspondence']

export function lichessToSummary(g: LichessGameJson): GameSummary {
  return {
    ref: { kind: 'lichess', id: g.id },
    white: toPlayer(g.players.white),
    black: toPlayer(g.players.black),
    result: toResult(g),
    date: koreanDate(g.createdAt),
    speed: SPEEDS.includes(g.speed as Speed) ? (g.speed as Speed) : 'unknown',
    timeControl: g.clock ? `${g.clock.initial / 60}+${g.clock.increment}` : undefined,
    variant: g.variant === 'standard' || g.variant === 'fromPosition' ? 'standard' : 'other',
  }
}

export interface LichessListOptions {
  max?: number
  until?: number
  signal?: AbortSignal
  onGame?: (game: GameSummary) => void
}

export async function listLichessGames(
  username: string,
  opts: LichessListOptions = {},
): Promise<{ games: GameSummary[]; nextUntil: number | null }> {
  const max = opts.max ?? 30
  const url = new URL(`${LICHESS}/api/games/user/${encodeURIComponent(username)}`)
  url.searchParams.set('max', String(max))
  if (opts.until !== undefined) url.searchParams.set('until', String(opts.until))
  const res = await request(url.toString(), { headers: { Accept: 'application/x-ndjson' }, signal: opts.signal })
  const games: GameSummary[] = []
  let lastCreatedAt: number | null = null
  for await (const raw of readNdjson<LichessGameJson>(res.body!)) {
    const game = lichessToSummary(raw)
    games.push(game)
    lastCreatedAt = raw.createdAt
    opts.onGame?.(game)
  }
  return { games, nextUntil: games.length === max && lastCreatedAt !== null ? lastCreatedAt - 1 : null }
}

export async function getLichessGame(id: string, signal?: AbortSignal): Promise<GameRecord> {
  const g = await getJson<LichessGameJson>(
    `${LICHESS}/game/export/${encodeURIComponent(id)}?pgnInJson=true&clocks=false&evals=false`,
    { signal },
  )
  return { ...lichessToSummary(g), pgn: g.pgn ?? '' }
}

function toPlayer(p: LichessPlayerJson): Player {
  if (p.user) return { name: p.user.name, rating: p.rating, title: p.user.title }
  if (p.aiLevel) return { name: `Stockfish level ${p.aiLevel}` }
  return { name: 'Anonymous' }
}

function toResult(g: LichessGameJson): Result {
  if (g.winner === 'white') return '1-0'
  if (g.winner === 'black') return '0-1'
  return UNFINISHED.has(g.status) ? '*' : '1/2-1/2'
}
