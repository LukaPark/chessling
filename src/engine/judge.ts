import type { Color, Turn } from '../chess/types'
import { winPercent, type Score } from './classify'

export type MoveLabel =
  | 'brilliant'
  | 'great'
  | 'best'
  | 'excellent'
  | 'good'
  | 'miss'
  | 'inaccuracy'
  | 'mistake'
  | 'blunder'

export const MOVE_LABELS: readonly MoveLabel[] = [
  'brilliant',
  'great',
  'best',
  'excellent',
  'good',
  'miss',
  'inaccuracy',
  'mistake',
  'blunder',
]

export const JUDGMENT_META: Record<MoveLabel, { name: string; glyph: string }> = {
  brilliant: { name: '탁월', glyph: '!!' },
  great: { name: '좋은 수', glyph: '!' },
  best: { name: '최선', glyph: '★' },
  excellent: { name: '우수', glyph: '' },
  good: { name: '좋음', glyph: '' },
  miss: { name: '놓침', glyph: '✕' },
  inaccuracy: { name: '부정확', glyph: '?!' },
  mistake: { name: '실수', glyph: '?' },
  blunder: { name: '블런더', glyph: '??' },
}

/** 두는 쪽 승률(%p) 기준 */
export const JUDGE_THRESHOLDS = {
  excellent: 2,
  good: 5,
  inaccuracy: 10,
  mistake: 15,
  miss: 10,
  greatGap: 10,
  /** 좋은 수(!)는 승부가 아직 열린 포지션에서만: greatMinBefore < 두기 전 < greatMaxBefore */
  greatMinBefore: 10,
  greatMaxBefore: 90,
  brilliantNearBest: 2,
  brilliantMaxBefore: 90,
  brilliantMinAfter: 50,
} as const

export interface JudgeInput {
  before: Score
  after: Score
  mover: Turn
  playedUci: string
  bestUci: string | null
  /** 두기 전 포지션의 2순위 수 점수(백 기준). 없으면 null */
  secondBefore: Score | null
  legalMoves: number
  sacrifice: boolean
  previousLabel: MoveLabel | null
  /** 직전 수가 잡은 칸에서 되잡는 수. 좋은 수(!)로 치지 않는다 */
  isRecapture?: boolean
}

export function judgeMove(i: JudgeInput): MoveLabel | null {
  if (i.legalMoves <= 1) return null
  const T = JUDGE_THRESHOLDS
  const pov = (s: Score) => (i.mover === 'w' ? winPercent(s) : 100 - winPercent(s))
  const winBefore = pov(i.before)
  const winAfter = pov(i.after)
  const loss = Math.max(0, winBefore - winAfter)
  const isBest = i.bestUci !== null && i.playedUci === i.bestUci

  if ((isBest || loss <= T.brilliantNearBest) && i.sacrifice && winBefore < T.brilliantMaxBefore && winAfter >= T.brilliantMinAfter)
    return 'brilliant'
  if (
    isBest &&
    !i.isRecapture &&
    i.secondBefore &&
    winBefore > T.greatMinBefore &&
    winBefore < T.greatMaxBefore &&
    winBefore - pov(i.secondBefore) >= T.greatGap
  )
    return 'great'
  if (isBest) return 'best'
  if (loss < T.excellent) return 'excellent'
  if (loss < T.good) return 'good'
  if ((i.previousLabel === 'mistake' || i.previousLabel === 'blunder') && loss >= T.miss) return 'miss'
  if (loss < T.inaccuracy) return 'inaccuracy'
  if (loss < T.mistake) return 'mistake'
  return 'blunder'
}

export function countJudgments(labels: (MoveLabel | null)[], startTurn: Turn): Record<Color, Record<MoveLabel, number>> {
  const empty = () => Object.fromEntries(MOVE_LABELS.map((l) => [l, 0])) as Record<MoveLabel, number>
  const counts: Record<Color, Record<MoveLabel, number>> = { white: empty(), black: empty() }
  labels.forEach((label, i) => {
    if (i === 0 || !label) return
    const mover: Color = ((i - 1) % 2 === 0) === (startTurn === 'w') ? 'white' : 'black'
    counts[mover][label]++
  })
  return counts
}
