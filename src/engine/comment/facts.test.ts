import { Chess } from 'chess.js'
import { describe, expect, it } from 'vitest'
import type { Ply } from '../../chess/types'
import type { MoveLabel } from '../judge'
import type { ReviewedPosition } from '../review'
import { bandOf, extractFacts, type CommentInput } from './facts'

function pliesFrom(fen: string, sans: string[]): Ply[] {
  const c = new Chess(fen)
  const out: Ply[] = [{ san: null, uci: null, fen }]
  for (const san of sans) {
    const m = c.move(san)
    out.push({ san: m.san, uci: m.from + m.to + (m.promotion ?? ''), fen: c.fen() })
  }
  return out
}
const pos = (cp: number, best: string | null = null, pv: string[] = []): ReviewedPosition => ({
  score: { cp }, best, pv, second: null, legalMoves: 20,
})
function input(plies: Ply[], positions: ReviewedPosition[], index: number, labels: (MoveLabel | null)[] = plies.map(() => null)): CommentInput {
  return { plies, positions, labels, index, seed: 't' }
}
const kinds = (facts: { kind: string }[]) => facts.map((f) => f.kind)

describe('extractFacts', () => {
  it('잡기와 체크', () => {
    const plies = pliesFrom('4k3/8/8/3p4/8/8/8/3QK3 w - - 0 1', ['Qxd5'])
    const f = extractFacts(input(plies, [pos(0), pos(800)], 1))
    expect(f).toContainEqual({ kind: 'capture', piece: 'q', captured: 'p', square: 'd5' })
  })
  it('메이트', () => {
    const plies = pliesFrom('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', ['Ra8#'])
    expect(kinds(extractFacts(input(plies, [pos(0), pos(10000)], 1)))).toContain('mate')
  })
  it('캐슬링과 전개', () => {
    const plies = pliesFrom('r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4', ['O-O'])
    expect(extractFacts(input(plies, [pos(0), pos(0)], 1))).toContainEqual({ kind: 'castle', long: false })
    const p2 = pliesFrom(new Chess().fen(), ['Nf3'])
    expect(extractFacts(input(p2, [pos(0), pos(0)], 1))).toContainEqual({ kind: 'develop', piece: 'n' })
  })
  it('포크: 나이트가 킹과 룩을 동시에', () => {
    const plies = pliesFrom('r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1', ['Nc7+'])
    const fork = extractFacts(input(plies, [pos(0), pos(500)], 1)).find((x) => x.kind === 'fork')
    expect(fork).toMatchObject({ piece: 'n', square: 'c7' })
    expect(fork && 'targets' in fork ? [...fork.targets].sort() : []).toEqual(['k', 'r'])
  })
  it('공짜로 놓인 기물: 움직인 퀸이 폰에게 공격받음', () => {
    const plies = pliesFrom('4k3/8/8/8/2p5/8/8/3QK3 w - - 0 1', ['Qd3'])
    expect(extractFacts(input(plies, [pos(0), pos(-800)], 1))).toContainEqual({ kind: 'hanging', piece: 'q', square: 'd3' })
  })
  it('놓친 수: 실수였고 최선 수가 기물을 땄다', () => {
    const plies = pliesFrom('4k3/8/8/3q4/8/8/8/3RK3 w - - 0 1', ['Ke2'])
    const f = extractFacts(input(plies, [pos(900, 'd1d5', ['d1d5']), pos(-900)], 1, [null, 'blunder']))
    expect(f.find((x) => x.kind === 'missed')).toMatchObject({ bestSan: 'Rxd5', gain: 'material' })
  })
  it('형세 구간 변화', () => {
    expect(bandOf({ cp: 0 })).toBe('equal')
    expect(bandOf({ cp: 900 })).toBe('whiteWinning')
    const plies = pliesFrom(new Chess().fen(), ['e4'])
    expect(extractFacts(input(plies, [pos(0), pos(400)], 1))).toContainEqual({ kind: 'band', from: 'equal', to: 'whiteBetter' })
  })
})
