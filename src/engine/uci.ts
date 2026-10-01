import type { Score } from './classify'

export interface RawInfo {
  depth: number
  multipv: number
  /** 두는 쪽 기준 */
  score: Score
  pv: string[]
}

export function parseInfo(line: string): RawInfo | null {
  if (!line.startsWith('info ') || / (lower|upper)bound( |$)/.test(line)) return null
  const t = line.split(/\s+/)
  let depth: number | undefined
  let multipv = 1
  let score: Score | undefined
  let pv: string[] = []
  for (let i = 1; i < t.length; i++) {
    switch (t[i]) {
      case 'depth':
        depth = Number(t[++i])
        break
      case 'multipv':
        multipv = Number(t[++i])
        break
      case 'score': {
        const kind = t[++i]
        const value = Number(t[++i])
        score = kind === 'mate' ? { mate: value } : { cp: value }
        break
      }
      case 'pv':
        pv = t.slice(i + 1)
        i = t.length
        break
    }
  }
  if (depth === undefined || !score || pv.length === 0) return null
  return { depth, multipv, score, pv }
}

export function parseBestMove(line: string): string | null | undefined {
  if (!line.startsWith('bestmove')) return undefined
  const move = line.split(/\s+/)[1]
  return !move || move === '(none)' ? null : move
}
