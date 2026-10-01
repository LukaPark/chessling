import { Chess } from 'chess.js'
import type { Ply, Result, Turn } from './types'

export class PgnError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PgnError'
  }
}

export function pgnToPlies(pgn: string): Ply[] {
  const chess = new Chess()
  try {
    chess.loadPgn(pgn)
  } catch (e) {
    throw new PgnError(e instanceof Error ? e.message : String(e))
  }
  const history = chess.history({ verbose: true })
  const startFen = history.length > 0 ? history[0].before : chess.fen()
  return [
    { san: null, uci: null, fen: startFen },
    ...history.map((m) => ({ san: m.san, uci: m.lan, fen: m.after })),
  ]
}

const HEADER_LINE = /^\s*\[(\w+)\s+"((?:[^"\\]|\\.)*)"\s*\]\s*$/gm

export function parseHeaders(pgn: string): Record<string, string> {
  const headers: Record<string, string> = {}
  for (const m of pgn.matchAll(HEADER_LINE)) headers[m[1]] = m[2].replace(/\\(.)/g, '$1')
  return headers
}

export function normalizeResult(value: string | undefined): Result {
  return value === '1-0' || value === '0-1' || value === '1/2-1/2' ? value : '*'
}

export function turnOf(fen: string): Turn {
  return fen.split(' ')[1] === 'b' ? 'b' : 'w'
}

export function isCheck(fen: string): boolean {
  return new Chess(fen).inCheck()
}

export function uciToMove(uci: string): { from: string; to: string; promotion?: string } {
  return { from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.length > 4 ? uci[4] : undefined }
}

export function pvToSan(fen: string, pv: string[], max = 8): string[] {
  const chess = new Chess(fen)
  const out: string[] = []
  for (const uci of pv.slice(0, max)) {
    try {
      out.push(chess.move(uciToMove(uci)).san)
    } catch {
      break
    }
  }
  return out
}

const KEEP_TAGS = new Set(['Event', 'Site', 'Date', 'Round', 'White', 'Black', 'Result', 'ECO', 'SetUp', 'FEN'])
const TAG_LINE = /^\s*\[(\w+)\s+".*"\s*\]\s*$/

export function stripAnnotations(pgn: string): string {
  const lines = pgn.split(/\r?\n/)
  const headers = lines
    .filter((l) => TAG_LINE.test(l))
    .map((l) => l.trim())
    .filter((l) => KEEP_TAGS.has(l.match(TAG_LINE)![1]))
  let body = lines.filter((l) => !TAG_LINE.test(l)).join('\n')
  body = body.replace(/\{[^}]*\}|;[^\n]*/g, ' ')
  let prev: string
  do {
    prev = body
    body = body.replace(/\([^()]*\)/g, ' ')
  } while (body !== prev)
  body = body.replace(/\$\d+/g, ' ').replace(/[!?]+/g, '').replace(/\s+/g, ' ').trim()
  return `${headers.join('\n')}\n\n${body}\n`
}
