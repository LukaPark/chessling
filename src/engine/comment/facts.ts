import { Chess, type Move, type PieceSymbol, type Square } from 'chess.js'
import { PIECE_VALUE } from '../../chess/material'
import { pvToSan } from '../../chess/pgn'
import type { Ply } from '../../chess/types'
import { winPercent, type Score } from '../classify'
import type { MoveLabel } from '../judge'
import type { ReviewedPosition } from '../review'

export interface CommentInput {
  plies: Ply[]
  positions: ReviewedPosition[]
  labels: (MoveLabel | null)[]
  /** 코멘트할 수 (1부터) */
  index: number
  seed: string
}

export type Band = 'whiteWinning' | 'whiteBetter' | 'equal' | 'blackBetter' | 'blackWinning'

export type Fact =
  | { kind: 'mate' }
  | { kind: 'check' }
  | { kind: 'capture'; piece: PieceSymbol; captured: PieceSymbol; square: Square }
  | { kind: 'recapture'; square: Square }
  | { kind: 'promotion'; to: PieceSymbol }
  | { kind: 'castle'; long: boolean }
  | { kind: 'develop'; piece: PieceSymbol }
  | { kind: 'centerPawn'; square: Square }
  | { kind: 'fork'; piece: PieceSymbol; square: Square; targets: PieceSymbol[] }
  | { kind: 'pin'; pinned: PieceSymbol; square: Square; behind: PieceSymbol }
  | { kind: 'hanging'; piece: PieceSymbol; square: Square }
  | { kind: 'rookFile'; file: string; open: boolean }
  | { kind: 'kingShield' }
  | { kind: 'trade'; piece: PieceSymbol }
  | { kind: 'missed'; bestSan: string; gain: 'mate' | 'material' | 'advantage'; amount: number }
  | { kind: 'refutation'; target: PieceSymbol; square: Square; san: string | null }
  | { kind: 'mateThreat'; forWhite: boolean; inMoves: number }
  | { kind: 'band'; from: Band; to: Band }

export function bandOf(score: Score): Band {
  const w = winPercent(score)
  if (w >= 90) return 'whiteWinning'
  if (w >= 65) return 'whiteBetter'
  if (w > 35) return 'equal'
  if (w > 10) return 'blackBetter'
  return 'blackWinning'
}

const CENTER = new Set(['d4', 'e4', 'd5', 'e5'])

function lastMove(plies: Ply[], index: number): Move | null {
  const prev = plies[index - 1]
  const ply = plies[index]
  if (!ply.uci) return null
  const c = new Chess(prev.fen)
  try {
    return c.move({ from: ply.uci.slice(0, 2), to: ply.uci.slice(2, 4), promotion: ply.uci[4] })
  } catch {
    return null
  }
}

/** sq에 있는 기물을 공격하는 상대 기물 가운데 가장 싼 값 */
function cheapestAttacker(chess: Chess, sq: Square, by: 'w' | 'b'): number | null {
  const vals = chess.attackers(sq, by).map((a) => PIECE_VALUE[chess.get(a)!.type])
  return vals.length ? Math.min(...vals) : null
}

function isHanging(chess: Chess, sq: Square): boolean {
  const piece = chess.get(sq)
  if (!piece || piece.type === 'k') return false
  const enemy = piece.color === 'w' ? 'b' : 'w'
  const attacker = cheapestAttacker(chess, sq, enemy)
  if (attacker === null) return false
  const defended = chess.attackers(sq, piece.color).length > 0
  return !defended || attacker < PIECE_VALUE[piece.type]
}

export function extractFacts(input: CommentInput): Fact[] {
  const { plies, positions, labels, index } = input
  const move = lastMove(plies, index)
  if (!move) return []
  const after = new Chess(plies[index].fen)
  const mover = move.color
  const enemy = mover === 'w' ? 'b' : 'w'
  const facts: Fact[] = []

  if (after.isCheckmate()) facts.push({ kind: 'mate' })
  else if (after.inCheck()) facts.push({ kind: 'check' })

  if (move.captured) {
    facts.push({ kind: 'capture', piece: move.piece, captured: move.captured, square: move.to })
    const prev = index > 1 ? lastMove(plies, index - 1) : null
    if (prev?.captured && prev.to === move.to) facts.push({ kind: 'recapture', square: move.to })
    // 같은 값의 교환: 잡은 기물을 곧바로 되잡을 수 있으면
    if (PIECE_VALUE[move.piece] === PIECE_VALUE[move.captured] && after.attackers(move.to, enemy).length > 0) {
      facts.push({ kind: 'trade', piece: move.captured })
    }
  }
  if (move.promotion) facts.push({ kind: 'promotion', to: move.promotion })
  if (move.san.startsWith('O-O')) facts.push({ kind: 'castle', long: move.san.startsWith('O-O-O') })

  const backRank = mover === 'w' ? '1' : '8'
  if ((move.piece === 'n' || move.piece === 'b') && move.from[1] === backRank && index <= 24) {
    facts.push({ kind: 'develop', piece: move.piece })
  }
  if (move.piece === 'p' && CENTER.has(move.to) && index <= 16) facts.push({ kind: 'centerPawn', square: move.to })

  // 포크: 움직인 기물이 상대 기물 2개 이상을 공격(킹이거나, 더 비싸거나, 방어가 없음)
  const targets: PieceSymbol[] = []
  for (const sq of attackedBy(after, move.to)) {
    const t = after.get(sq)
    if (!t || t.color !== enemy) continue
    const undefended = after.attackers(sq, enemy).length === 0
    if (t.type === 'k' || PIECE_VALUE[t.type] > PIECE_VALUE[move.piece] || undefended) targets.push(t.type)
  }
  if (targets.length >= 2 && !isHanging(after, move.to)) facts.push({ kind: 'fork', piece: move.piece, square: move.to, targets })

  const pin = findPin(after, move.to)
  if (pin) facts.push(pin)

  // 공짜로 놓인 기물: 움직인 기물, 또는 움직이면서 방어가 풀린 자기 기물
  if (isHanging(after, move.to) && !move.captured) facts.push({ kind: 'hanging', piece: move.piece, square: move.to })

  if (move.piece === 'r') {
    const file = move.to[0]
    const pawns = fileHasPawn(after, file)
    if (!pawns.own) facts.push({ kind: 'rookFile', file, open: !pawns.enemy })
  }
  if (move.piece === 'p' && kingShieldFiles(after, mover).includes(move.from[0]) && !move.captured) facts.push({ kind: 'kingShield' })

  const label = labels[index]
  const before = positions[index - 1]
  if (label && (label === 'mistake' || label === 'blunder' || label === 'miss') && before?.best && before.best !== plies[index].uci) {
    const missed = describeMissed(plies[index - 1].fen, before)
    if (missed) facts.push(missed)
  }
  const reply = positions[index]?.pv[0]
  if (label && (label === 'mistake' || label === 'blunder') && reply) {
    const r = describeRefutation(plies[index].fen, reply, plies[index + 1]?.uci ?? null)
    if (r) facts.push(r)
  }

  const s = positions[index]?.score
  if (s && 'mate' in s && !after.isCheckmate()) facts.push({ kind: 'mateThreat', forWhite: s.mate > 0, inMoves: Math.abs(s.mate) })
  if (before && s) {
    const from = bandOf(before.score)
    const to = bandOf(s)
    if (from !== to) facts.push({ kind: 'band', from, to })
  }
  return facts
}

/** sq의 기물이 공격하는 칸들 */
function attackedBy(chess: Chess, sq: Square): Square[] {
  const piece = chess.get(sq)
  if (!piece) return []
  const out: Square[] = []
  for (const file of 'abcdefgh') {
    for (const rank of '12345678') {
      const t = `${file}${rank}` as Square
      if (t !== sq && chess.attackers(t, piece.color).includes(sq)) out.push(t)
    }
  }
  return out
}

const LINE_DIRS: Record<string, [number, number][]> = {
  b: [[1, 1], [1, -1], [-1, 1], [-1, -1]],
  r: [[1, 0], [-1, 0], [0, 1], [0, -1]],
  q: [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]],
}

/** 움직인 직선 기물이 상대 기물을 더 비싼 기물(킹·퀸)에 묶었는가 */
function findPin(chess: Chess, from: Square): Fact | null {
  const piece = chess.get(from)
  if (!piece || !LINE_DIRS[piece.type]) return null
  for (const [df, dr] of LINE_DIRS[piece.type]) {
    let first: { sq: Square; type: PieceSymbol } | null = null
    let f = from.charCodeAt(0) - 97 + df
    let r = Number(from[1]) - 1 + dr
    while (f >= 0 && f < 8 && r >= 0 && r < 8) {
      const sq = `${String.fromCharCode(97 + f)}${r + 1}` as Square
      const t = chess.get(sq)
      if (t) {
        if (t.color === piece.color) break
        if (!first) first = { sq, type: t.type }
        else {
          if ((t.type === 'k' || t.type === 'q') && PIECE_VALUE[first.type] < PIECE_VALUE[t.type] + (t.type === 'k' ? 100 : 0)) {
            return { kind: 'pin', pinned: first.type, square: first.sq, behind: t.type }
          }
          break
        }
      }
      f += df
      r += dr
    }
  }
  return null
}

function fileHasPawn(chess: Chess, file: string): { own: boolean; enemy: boolean } {
  const turn = chess.turn() // 다음 둘 쪽 = 상대
  let own = false
  let enemy = false
  for (const rank of '12345678') {
    const p = chess.get(`${file}${rank}` as Square)
    if (p?.type === 'p') {
      if (p.color === turn) enemy = true
      else own = true
    }
  }
  return { own, enemy }
}

function kingShieldFiles(chess: Chess, color: 'w' | 'b'): string[] {
  const king = chess.board().flat().find((p) => p?.type === 'k' && p.color === color)
  if (!king) return []
  const f = king.square.charCodeAt(0) - 97
  return [f - 1, f, f + 1].filter((x) => x >= 0 && x < 8).map((x) => String.fromCharCode(97 + x))
}

function describeMissed(fenBefore: string, before: ReviewedPosition): Fact | null {
  const bestSan = pvToSan(fenBefore, [before.best!], 1)[0]
  if (!bestSan) return null
  if ('mate' in before.score) return { kind: 'missed', bestSan, gain: 'mate', amount: Math.abs(before.score.mate) }
  const c = new Chess(fenBefore)
  const m = c.move({ from: before.best!.slice(0, 2), to: before.best!.slice(2, 4), promotion: before.best![4] })
  if (m.captured) return { kind: 'missed', bestSan, gain: 'material', amount: PIECE_VALUE[m.captured] }
  return { kind: 'missed', bestSan, gain: 'advantage', amount: 0 }
}

/** 상대의 최선 응수가 무엇을 따는지. 실제 다음 기보 수와 같으면 SAN을 숨긴다 */
function describeRefutation(fenAfter: string, replyUci: string, nextGameUci: string | null): Fact | null {
  const c = new Chess(fenAfter)
  let m: Move
  try {
    m = c.move({ from: replyUci.slice(0, 2), to: replyUci.slice(2, 4), promotion: replyUci[4] })
  } catch {
    return null
  }
  if (!m.captured || PIECE_VALUE[m.captured] < 3) return null
  return { kind: 'refutation', target: m.captured, square: m.to, san: replyUci === nextGameUci ? null : m.san }
}
