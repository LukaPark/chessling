import { koreanDate } from '../chess/date'
import { parseHeaders } from '../chess/pgn'
import type { GameRecord, Result, Speed } from '../chess/types'
import { getJson, HttpError } from './http'

export const CHESSCOM = 'https://api.chess.com/pub'

interface ChesscomPlayerJson {
  username: string
  rating: number
  result: string
}
export interface ChesscomGameJson {
  url: string
  pgn?: string
  time_control: string
  end_time: number
  uuid: string
  time_class: string
  rules: string
  white: ChesscomPlayerJson
  black: ChesscomPlayerJson
}
export interface ArchiveMonth {
  yyyy: string
  mm: string
}

const DRAWS = new Set(['agreed', 'repetition', 'stalemate', 'insufficient', '50move', 'timevsinsufficient'])

// Chess.com은 병렬 요청에 429를 준다. 이 모듈의 함수는 항상 한 번에 하나씩 호출한다.
export async function listArchives(user: string, signal?: AbortSignal): Promise<ArchiveMonth[]> {
  const { archives } = await getJson<{ archives: string[] }>(
    `${CHESSCOM}/player/${encodeURIComponent(user.toLowerCase())}/games/archives`,
    { signal },
  )
  return archives
    .map((url) => url.match(/\/(\d{4})\/(\d{2})$/))
    .filter((m): m is RegExpMatchArray => m !== null)
    .map((m) => ({ yyyy: m[1], mm: m[2] }))
}

export async function fetchChesscomMonth(user: string, yyyy: string, mm: string, signal?: AbortSignal): Promise<GameRecord[]> {
  const u = user.toLowerCase()
  const { games } = await getJson<{ games: ChesscomGameJson[] }>(
    `${CHESSCOM}/player/${encodeURIComponent(u)}/games/${yyyy}/${mm}`,
    { signal },
  )
  return games.map((g) => chesscomToRecord(u, yyyy, mm, g)).reverse()
}

export function findInMonth(records: GameRecord[], uuid: string): GameRecord {
  const found = records.find((r) => r.ref.kind === 'chesscom' && r.ref.uuid === uuid)
  if (!found) throw new HttpError('not_found', 404, `대국 ${uuid}를 찾을 수 없습니다`)
  return found
}

function chesscomToRecord(user: string, yyyy: string, mm: string, g: ChesscomGameJson): GameRecord {
  const headers = parseHeaders(g.pgn ?? '')
  const started = headers.UTCDate ?? headers.Date
  const startDate = started && /^\d{4}\.\d{2}\.\d{2}$/.test(started) ? started.replaceAll('.', '-') : null
  const startTime = headers.UTCTime
  const startTimestamp = startDate && startTime && /^\d{2}:\d{2}:\d{2}$/.test(startTime)
    ? Date.parse(`${startDate}T${startTime}Z`) : NaN
  // 시간 없는 PGN은 날짜를 그대로 둔다. 시작 시각을 알면 KST로 변환한다.
  const date = Number.isFinite(startTimestamp) ? koreanDate(startTimestamp) : startDate ?? koreanDate(g.end_time * 1000)
  return {
    ref: { kind: 'chesscom', user, yyyy, mm, uuid: g.uuid },
    white: { name: g.white.username, rating: g.white.rating },
    black: { name: g.black.username, rating: g.black.rating },
    result: toResult(g),
    date,
    speed: toSpeed(g.time_class),
    timeControl: g.time_control,
    variant: g.rules === 'chess' ? 'standard' : 'other',
    pgn: g.pgn ?? '',
  }
}

function toResult(g: ChesscomGameJson): Result {
  if (g.white.result === 'win') return '1-0'
  if (g.black.result === 'win') return '0-1'
  if (DRAWS.has(g.white.result)) return '1/2-1/2'
  return '*'
}

function toSpeed(timeClass: string): Speed {
  return timeClass === 'bullet' || timeClass === 'blitz' || timeClass === 'rapid' || timeClass === 'daily'
    ? timeClass
    : 'unknown'
}

/** KST 달에 걸칠 수 있는 인접 아카이브를 순차로 읽는다. ref는 원본 아카이브 월을 유지한다. */
export async function fetchChesscomKoreanMonth(user: string, yyyy: string, mm: string, archives: ArchiveMonth[], signal?: AbortSignal): Promise<GameRecord[]> {
  const target = Number(yyyy) * 12 + Number(mm) - 1
  const candidates = archives.filter((m) => Math.abs(Number(m.yyyy) * 12 + Number(m.mm) - 1 - target) <= 1).slice().reverse()
  const records = new Map<string, GameRecord>()
  for (const archive of candidates) {
    const games = await fetchChesscomMonth(user, archive.yyyy, archive.mm, signal)
    for (const game of games) {
      if (game.date?.startsWith(`${yyyy}-${mm}`) && game.ref.kind === 'chesscom') records.set(game.ref.uuid, game)
    }
  }
  return [...records.values()].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
}

export function koreanArchiveMonths(archives: ArchiveMonth[], now = new Date()): ArchiveMonth[] {
  const months = new Map<string, ArchiveMonth>()
  const current = koreanDate(now.getTime()).slice(0, 7)
  for (const month of archives) {
    months.set(`${month.yyyy}-${month.mm}`, month)
    const next = new Date(Date.UTC(Number(month.yyyy), Number(month.mm), 1)).toISOString().slice(0, 7)
    if (next <= current) months.set(next, { yyyy: next.slice(0, 4), mm: next.slice(5) })
  }
  return [...months.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, month]) => month)
}
