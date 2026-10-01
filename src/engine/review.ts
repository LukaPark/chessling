import { Chess } from 'chess.js'
import { isSacrifice } from '../chess/material'
import { turnOf } from '../chess/pgn'
import type { Ply } from '../chess/types'
import { gameAccuracy, MATED_CP, type Score } from './classify'
import { judgeMove, type MoveLabel } from './judge'
import type { UciEngine } from './UciEngine'

export const REVIEW_DEPTH = 14
export const REVIEW_VERSION = 2

export interface ReviewedPosition {
  score: Score
  best: string | null
  /** 1순위 수순 (best 포함) */
  pv: string[]
  /** 2순위 수 점수(백 기준). 없으면 null */
  second: Score | null
  legalMoves: number
}
export interface GameReview {
  version: typeof REVIEW_VERSION
  depth: number
  positions: ReviewedPosition[]
  labels: (MoveLabel | null)[]
  accuracy: { white: number | null; black: number | null }
}
export interface ReviewOptions {
  depth?: number
  signal?: AbortSignal
  onProgress?: (done: number, total: number, positions: ReviewedPosition[]) => void
}

export function terminalScore(fen: string): Score | null {
  const chess = new Chess(fen)
  if (chess.isCheckmate()) return { cp: chess.turn() === 'w' ? -MATED_CP : MATED_CP }
  if (chess.isStalemate() || chess.isInsufficientMaterial()) return { cp: 0 }
  return null
}

export function buildReview(plies: Ply[], positions: ReviewedPosition[], depth: number): GameReview {
  const labels: (MoveLabel | null)[] = [null]
  for (let i = 1; i < plies.length; i++) {
    const ply = plies[i]
    const before = positions[i - 1]
    if (!ply.uci) {
      labels.push(null)
      continue
    }
    labels.push(
      judgeMove({
        before: before.score,
        after: positions[i].score,
        mover: turnOf(plies[i - 1].fen),
        playedUci: ply.uci,
        bestUci: before.best,
        secondBefore: before.second,
        legalMoves: before.legalMoves,
        sacrifice: isSacrifice(plies[i - 1].fen, ply.uci, positions[i].pv),
        previousLabel: labels[i - 1],
        isRecapture: isRecapture(plies[i - 1], ply),
      }),
    )
  }
  return {
    version: REVIEW_VERSION,
    depth,
    positions,
    labels,
    accuracy: gameAccuracy(positions.map((p) => p.score), turnOf(plies[0].fen)),
  }
}

/** 직전 수가 잡은 칸에서 곧바로 되잡는 수인가 */
function isRecapture(prev: Ply, ply: Ply): boolean {
  if (!prev.uci || !ply.uci || !prev.san?.includes('x') || !ply.san?.includes('x')) return false
  return prev.uci.slice(2, 4) === ply.uci.slice(2, 4)
}

export async function reviewGame(
  engine: Pick<UciEngine, 'analyze'>,
  plies: Ply[],
  opts: ReviewOptions = {},
): Promise<GameReview> {
  const depth = opts.depth ?? REVIEW_DEPTH
  const positions: ReviewedPosition[] = []
  for (const ply of plies) {
    if (opts.signal?.aborted) throw abortError()
    const terminal = terminalScore(ply.fen)
    if (terminal) {
      positions.push({ score: terminal, best: null, pv: [], second: null, legalMoves: 0 })
    } else {
      const r = await engine.analyze(ply.fen, { depth, multiPv: 2, signal: opts.signal })
      if (r.cancelled) throw abortError()
      const [first, second] = r.lines
      positions.push({
        score: first?.score ?? { cp: 0 },
        best: r.bestMove,
        pv: first?.pv ?? [],
        second: second?.score ?? null,
        legalMoves: new Chess(ply.fen).moves().length,
      })
    }
    opts.onProgress?.(positions.length, plies.length, positions)
  }
  return buildReview(plies, positions, depth)
}

function abortError(): DOMException {
  return new DOMException('리뷰가 중단됐습니다', 'AbortError')
}
