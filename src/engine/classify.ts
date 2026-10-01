import type { Turn } from '../chess/types'

export type Score = { cp: number } | { mate: number }

export const MATED_CP = 10000

export function toWhitePov(score: Score, turn: Turn): Score {
  if ('mate' in score) {
    if (score.mate === 0) return { cp: turn === 'w' ? -MATED_CP : MATED_CP }
    return { mate: turn === 'w' ? score.mate : 0 - score.mate }
  }
  return { cp: turn === 'w' ? score.cp : 0 - score.cp }
}

export function winPercent(score: Score): number {
  if ('mate' in score) return score.mate > 0 ? 100 : 0
  // 종국 메이트는 {cp: ±MATED_CP}로 저장된다. 잘라서 97.5가 되지 않게 100/0으로.
  if (Math.abs(score.cp) >= MATED_CP) return score.cp > 0 ? 100 : 0
  const cp = Math.max(-1000, Math.min(1000, score.cp))
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1)
}

export function moveAccuracy(winBefore: number, winAfter: number): number {
  if (winAfter >= winBefore) return 100
  const raw = 103.1668100711649 * Math.exp(-0.04354415386753951 * (winBefore - winAfter)) - 3.166924740191411
  return clamp(raw + 1, 0, 100)
}

/** Lichess 방식: 변동성 가중 평균과 조화 평균의 평균 */
export function gameAccuracy(scores: Score[], startTurn: Turn): { white: number | null; black: number | null } {
  const wins = scores.map(winPercent)
  if (wins.length < 2) return { white: null, black: null }
  const windowSize = clamp(Math.floor(wins.length / 10), 2, 8)
  const windows: number[][] = []
  for (let i = 0; i < windowSize - 2; i++) windows.push(wins.slice(0, windowSize))
  for (let i = 0; i + windowSize <= wins.length; i++) windows.push(wins.slice(i, i + windowSize))
  const weights = windows.map((w) => clamp(stdDev(w), 0.5, 12))

  const acc: Record<'white' | 'black', Array<[number, number]>> = { white: [], black: [] }
  for (let i = 0; i < wins.length - 1; i++) {
    const mover = (i % 2 === 0) === (startTurn === 'w') ? 'white' : 'black'
    const before = mover === 'white' ? wins[i] : 100 - wins[i]
    const after = mover === 'white' ? wins[i + 1] : 100 - wins[i + 1]
    acc[mover].push([moveAccuracy(before, after), weights[i]])
  }
  return { white: summarize(acc.white), black: summarize(acc.black) }
}

export function formatScore(score: Score): string {
  if ('mate' in score) return score.mate > 0 ? `M${score.mate}` : `-M${-score.mate}`
  if (Math.abs(score.cp) >= MATED_CP) return '#'
  const v = (score.cp / 100).toFixed(2)
  return score.cp > 0 ? `+${v}` : v
}

function summarize(xs: Array<[number, number]>): number | null {
  if (xs.length === 0) return null
  const totalWeight = xs.reduce((s, [, w]) => s + w, 0)
  const weighted = xs.reduce((s, [a, w]) => s + a * w, 0) / totalWeight
  // 정확도 0이 섞이면 조화 평균이 0으로 붕괴하므로 1로 하한을 둔다
  const harmonic = xs.length / xs.reduce((s, [a]) => s + 1 / Math.max(a, 1), 0)
  return (weighted + harmonic) / 2
}

function stdDev(xs: number[]): number {
  const mean = xs.reduce((s, x) => s + x, 0) / xs.length
  return Math.sqrt(xs.reduce((s, x) => s + (x - mean) ** 2, 0) / xs.length)
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x))
}
