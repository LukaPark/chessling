import { Chess } from 'chess.js'
import { describe, expect, it } from 'vitest'
import type { Ply } from '../../chess/types'
import type { MoveLabel } from '../judge'
import type { ReviewedPosition } from '../review'
import type { CommentInput } from './facts'
import { GUIDE_MAX, guideFor } from './guide'

function pliesFrom(fen: string, sans: string[]): Ply[] {
  const c = new Chess(fen)
  const out: Ply[] = [{ san: null, uci: null, fen }]
  for (const san of sans) {
    const m = c.move(san)
    out.push({ san: m.san, uci: m.from + m.to + (m.promotion ?? ''), fen: c.fen() })
  }
  return out
}
const pos = (cp: number, best: string | null = null, pv: string[] = []): ReviewedPosition => ({ score: { cp }, best, pv, second: null, legalMoves: 20 })
const input = (plies: Ply[], index: number, positions: ReviewedPosition[] = [], labels: (MoveLabel | null)[] = []): CommentInput => ({ plies, positions, labels, index, seed: 't' })

describe('guideFor', () => {
  it('시작 포지션과 메이트에는 가이드가 없다', () => {
    const plies = pliesFrom('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', ['Ra8#'])
    expect(guideFor(input(plies, 0))).toEqual([])
    expect(guideFor(input(plies, 1))).toEqual([])
  })

  it('포크: 움직인 기물에서 목표마다 초록 화살표', () => {
    const plies = pliesFrom('r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1', ['Nc7+'])
    const g = guideFor(input(plies, 1))
    expect(g).toHaveLength(2)
    expect(g).toContainEqual({ kind: 'attack', from: 'c7', to: 'a8' })
    expect(g).toContainEqual({ kind: 'attack', from: 'c7', to: 'e8' })
  })

  it('핀: 거는 기물에서 묶인 기물로 화살표, 묶인 기물에 빨간 원', () => {
    const plies = pliesFrom('4k3/8/2n5/8/8/8/8/4KB2 w - - 0 1', ['Bb5'])
    const g = guideFor(input(plies, 1))
    expect(g).toContainEqual({ kind: 'attack', from: 'b5', to: 'c6' })
    expect(g).toContainEqual({ kind: 'danger', to: 'c6' })
  })

  it('노림: 방어 없는 기물을 공격하면 화살표', () => {
    const plies = pliesFrom('4k3/8/8/3n4/8/8/8/R3K3 w - - 0 1', ['Ra5'])
    expect(guideFor(input(plies, 1))).toEqual([{ kind: 'attack', from: 'a5', to: 'd5' }])
  })

  it('노림: 사이에 기물이 끼어 막힌 줄은 치지 않는다', () => {
    // a5 룩과 d5 나이트 사이 c5에 흑 폰(b6 폰이 받침)
    const plies = pliesFrom('4k3/8/1p6/2pn4/8/8/8/R3K3 w - - 0 1', ['Ra5'])
    expect(guideFor(input(plies, 1))).not.toContainEqual({ kind: 'attack', from: 'a5', to: 'd5' })
  })

  it('노림 다음에 걸린 기물(빨간 원)', () => {
    const plies = pliesFrom('4k3/8/8/8/2p5/8/8/3QK3 w - - 0 1', ['Qd3'])
    expect(guideFor(input(plies, 1))).toEqual([
      { kind: 'attack', from: 'd3', to: 'c4' },
      { kind: 'danger', to: 'd3' },
    ])
  })

  it('놓친 수: 리뷰 전에는 없고, 리뷰 뒤에는 맨 앞에 파란 화살표', () => {
    const plies = pliesFrom('4k3/8/8/3q4/8/8/8/3RK3 w - - 0 1', ['Ke2'])
    expect(guideFor(input(plies, 1)).some((s) => s.kind === 'missed')).toBe(false)
    const g = guideFor(input(plies, 1, [pos(900, 'd1d5', ['d1d5']), pos(-900)], [null, 'blunder']))
    expect(g[0]).toEqual({ kind: 'missed', from: 'd1', to: 'd5' })
  })

  it('반박: 실수 뒤 상대의 응징 수를 빨간 화살표로', () => {
    const plies = pliesFrom('3rk3/8/8/8/8/8/8/3QK3 w - - 0 1', ['Ke2'])
    const g = guideFor(input(plies, 1, [pos(0), pos(-900, 'd8d1', ['d8d1'])], [null, 'blunder']))
    expect(g).toContainEqual({ kind: 'danger', from: 'd8', to: 'd1' })
  })

  it(`최대 ${GUIDE_MAX}개까지만`, () => {
    // d6 나이트가 킹·퀸·룩 두 개를 함께 공격
    const plies = pliesFrom('2q1k3/1r3r2/8/1N6/8/8/8/4K3 w - - 0 1', ['Nd6+'])
    const g = guideFor(input(plies, 1))
    expect(g).toHaveLength(GUIDE_MAX)
    expect(g.every((s) => s.kind === 'attack' && s.from === 'd6')).toBe(true)
  })
})
