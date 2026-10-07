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
  for (let i = 1; i < plies.length; i++) labels.push(judgePly(plies, positions, i, labels[i - 1]))
  return {
    version: REVIEW_VERSION,
    depth,
    positions,
    labels,
    accuracy: gameAccuracy(positions.map((p) => p.score), turnOf(plies[0].fen)),
  }
}

/**
 * i번째 수를 판정한다. positions는 i - 1과 i 두 칸만 있으면 된다(나머지는 비어 있어도 된다).
 * previousLabel: 직전 수(i - 1)의 판정. 놓침(miss)을 가리는 데 쓴다.
 */
export function judgePly(plies: Ply[], positions: ReviewedPosition[], i: number, previousLabel: MoveLabel | null): MoveLabel | null {
  const ply = plies[i]
  if (i < 1 || !ply?.uci) return null
  const before = positions[i - 1]
  return judgeMove({
    before: before.score,
    after: positions[i].score,
    mover: turnOf(plies[i - 1].fen),
    playedUci: ply.uci,
    bestUci: before.best,
    secondBefore: before.second,
    legalMoves: before.legalMoves,
    sacrifice: sacrificeAt(plies, positions, i),
    previousLabel,
    isRecapture: isRecapture(plies[i - 1], ply),
  })
}

/** i번째 수가 기물을 내주는 희생인가(그 수 뒤 최선 수순까지 보고 판단) */
export function sacrificeAt(plies: Ply[], positions: ReviewedPosition[], i: number): boolean {
  const ply = plies[i]
  if (i < 1 || !ply?.uci || !positions[i]) return false
  return isSacrifice(plies[i - 1].fen, ply.uci, positions[i].pv)
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
    const position = await analyzePosition(engine, ply.fen, { depth, signal: opts.signal })
    if (!position) throw abortError()
    positions.push(position)
    opts.onProgress?.(positions.length, plies.length, positions)
  }
  return buildReview(plies, positions, depth)
}

/** 한 포지션을 리뷰 기준(MultiPV 2)으로 분석한다. 끝난 포지션은 엔진 없이 매기고, 취소되면 null */
export async function analyzePosition(
  engine: Pick<UciEngine, 'analyze'>,
  fen: string,
  opts: { depth?: number; signal?: AbortSignal } = {},
): Promise<ReviewedPosition | null> {
  const terminal = terminalScore(fen)
  if (terminal) return { score: terminal, best: null, pv: [], second: null, legalMoves: 0 }
  const r = await engine.analyze(fen, { depth: opts.depth ?? REVIEW_DEPTH, multiPv: 2, signal: opts.signal })
  if (r.cancelled) return null
  const [first, second] = r.lines
  return {
    score: first?.score ?? { cp: 0 },
    best: r.bestMove,
    pv: first?.pv ?? [],
    second: second?.score ?? null,
    legalMoves: new Chess(fen).moves().length,
  }
}

function abortError(): DOMException {
  return new DOMException('리뷰가 중단됐습니다', 'AbortError')
}
