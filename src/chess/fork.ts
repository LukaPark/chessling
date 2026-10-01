import { Chess } from 'chess.js'
import type { GameRef } from './gameRef'
import { turnOf, uciToMove } from './pgn'
import type { Color, Ply, Result } from './types'

export const ELO_MIN = 1320
export const ELO_MAX = 3190
export const DEFAULT_ELO = 1800

export type EndReason = 'checkmate' | 'stalemate' | 'threefold' | 'fifty' | 'insufficient' | 'resign'

export interface ForkRecord {
  id: string
  title: string
  origin: GameRef
  originPly: number
  startFen: string
  /** UCI */
  moves: string[]
  playerColor: Color
  engineElo: number
  result: Result
  endReason?: EndReason
  createdAt: number
  updatedAt: number
}

export interface ForkStatus {
  over: boolean
  result: Result
  reason?: EndReason
  fen: string
  turn: Color
  check: boolean
  lastMove: string | null
}

export class IllegalMoveError extends Error {
  constructor(uci: string) {
    super(`불법 수: ${uci}`)
    this.name = 'IllegalMoveError'
  }
}

export function createFork(
  input: Pick<ForkRecord, 'origin' | 'originPly' | 'startFen' | 'playerColor' | 'engineElo' | 'title'>,
  now = Date.now(),
  id: string = crypto.randomUUID(),
): ForkRecord {
  return { id, ...input, moves: [], result: '*', createdAt: now, updatedAt: now }
}

function replay(startFen: string, moves: string[]): Chess {
  const chess = new Chess(startFen)
  for (const m of moves) chess.move(uciToMove(m))
  return chess
}

export function forkStatus(fork: ForkRecord): ForkStatus {
  const c = replay(fork.startFen, fork.moves)
  const turn: Color = c.turn() === 'w' ? 'white' : 'black'
  const base = { fen: c.fen(), turn, check: c.inCheck(), lastMove: fork.moves.at(-1) ?? null }
  if (fork.endReason === 'resign') return { ...base, over: true, result: fork.result, reason: 'resign' }
  if (c.isCheckmate()) return { ...base, over: true, result: turn === 'white' ? '0-1' : '1-0', reason: 'checkmate' }
  if (c.isStalemate()) return { ...base, over: true, result: '1/2-1/2', reason: 'stalemate' }
  if (c.isInsufficientMaterial()) return { ...base, over: true, result: '1/2-1/2', reason: 'insufficient' }
  if (c.isThreefoldRepetition()) return { ...base, over: true, result: '1/2-1/2', reason: 'threefold' }
  if (c.isDrawByFiftyMoves()) return { ...base, over: true, result: '1/2-1/2', reason: 'fifty' }
  return { ...base, over: false, result: '*' }
}

export function applyMove(fork: ForkRecord, uci: string, now = Date.now()): ForkRecord {
  const c = replay(fork.startFen, fork.moves)
  try {
    c.move(uciToMove(uci))
  } catch {
    throw new IllegalMoveError(uci)
  }
  const next: ForkRecord = { ...fork, moves: [...fork.moves, uci], updatedAt: now }
  const s = forkStatus(next)
  return s.over ? { ...next, result: s.result, endReason: s.reason } : next
}

export function takeback(fork: ForkRecord, now = Date.now()): ForkRecord {
  const startTurn: Color = turnOf(fork.startFen) === 'w' ? 'white' : 'black'
  const moverOf = (index: number): Color => (index % 2 === 0 ? startTurn : opposite(startTurn))
  const moves = [...fork.moves]
  let removedPlayerMove = false
  while (moves.length > 0) {
    const mover = moverOf(moves.length - 1)
    moves.pop()
    if (mover === fork.playerColor) removedPlayerMove = true
    if (removedPlayerMove && moverOf(moves.length) === fork.playerColor) break
  }
  if (!removedPlayerMove) return fork
  return { ...fork, moves, result: '*', endReason: undefined, updatedAt: now }
}

export function resign(fork: ForkRecord, now = Date.now()): ForkRecord {
  return { ...fork, result: fork.playerColor === 'white' ? '0-1' : '1-0', endReason: 'resign', updatedAt: now }
}

export function toUci(fen: string, from: string, to: string): string {
  const piece = new Chess(fen).get(from as Parameters<Chess['get']>[0])
  const promotes = piece?.type === 'p' && (to[1] === '8' || to[1] === '1')
  return `${from}${to}${promotes ? 'q' : ''}`
}

export function legalDests(fen: string): Map<string, string[]> {
  const dests = new Map<string, string[]>()
  for (const m of new Chess(fen).moves({ verbose: true })) {
    const list = dests.get(m.from) ?? []
    if (!list.includes(m.to)) list.push(m.to)
    dests.set(m.from, list)
  }
  return dests
}

export function movetimeFor(elo: number): number {
  const t = (Math.min(ELO_MAX, Math.max(ELO_MIN, elo)) - ELO_MIN) / (ELO_MAX - ELO_MIN)
  return Math.round(300 + t * 1200)
}

export function forkPlies(fork: ForkRecord): Ply[] {
  const chess = new Chess(fork.startFen)
  const plies: Ply[] = [{ san: null, uci: null, fen: fork.startFen }]
  for (const uci of fork.moves) {
    const m = chess.move(uciToMove(uci))
    plies.push({ san: m.san, uci, fen: m.after })
  }
  return plies
}

export function engineName(elo: number): string {
  return `Stockfish (Elo ${elo})`
}

export function forkToPgn(fork: ForkRecord): string {
  const c = replay(fork.startFen, fork.moves)
  const engine = engineName(fork.engineElo)
  c.setHeader('Event', 'Chessling fork')
  c.setHeader('Site', 'Chessling')
  c.setHeader('Date', new Date(fork.createdAt).toISOString().slice(0, 10).replace(/-/g, '.'))
  c.setHeader('White', fork.playerColor === 'white' ? 'You' : engine)
  c.setHeader('Black', fork.playerColor === 'black' ? 'You' : engine)
  c.setHeader('Result', fork.result)
  return c.pgn()
}

function opposite(c: Color): Color {
  return c === 'white' ? 'black' : 'white'
}
