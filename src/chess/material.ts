import { Chess } from 'chess.js'
import { turnOf, uciToMove } from './pgn'
import type { Turn } from './types'

export const PIECE_VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 } as const

export function materialBalance(fen: string, side: Turn): number {
  let sum = 0
  for (const row of new Chess(fen).board()) {
    for (const sq of row) {
      if (!sq) continue
      const v = PIECE_VALUE[sq.type]
      sum += sq.color === side ? v : -v
    }
  }
  return sum
}

/** 내 수 + 상대 응수 + 내 응수(최대 3플라이) 뒤 기물 균형이 threshold 이상 줄면 희생 */
export function isSacrifice(fenBefore: string, playedUci: string, pvAfter: string[], threshold = 2): boolean {
  const mover = turnOf(fenBefore)
  const start = materialBalance(fenBefore, mover)
  const chess = new Chess(fenBefore)
  try {
    chess.move(uciToMove(playedUci))
  } catch {
    return false
  }
  for (const uci of pvAfter.slice(0, 2)) {
    try {
      chess.move(uciToMove(uci))
    } catch {
      break
    }
  }
  return start - materialBalance(chess.fen(), mover) >= threshold
}
