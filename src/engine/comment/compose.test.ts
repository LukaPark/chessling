import { Chess } from 'chess.js'
import { describe, expect, it } from 'vitest'
import type { Ply } from '../../chess/types'
import type { MoveLabel } from '../judge'
import type { ReviewedPosition } from '../review'
import type { Fact } from './facts'
import { commentFor, commentsForGame } from './index'
import { PHRASES, QUIET } from './phrases.ko'

const BANNED = [/것입니다/, /중요한 순간/, /놀라운/, /라고 할 수 있/, /매우 흥미로운/]
/** 받침과 맞지 않는 조사 */
const WRONG_JOSA = /(백|흑|킹|룩|폰|퀸|숍)(가|는|를|와|로)(?![가-힣])|(트)(이|은|을|과|으로)(?![가-힣])/

function game(sans: string[]): Ply[] {
  const c = new Chess()
  const out: Ply[] = [{ san: null, uci: null, fen: c.fen() }]
  for (const s of sans) {
    const m = c.move(s)
    out.push({ san: m.san, uci: m.from + m.to + (m.promotion ?? ''), fen: c.fen() })
  }
  return out
}
const flat = (n: number): ReviewedPosition[] => Array.from({ length: n }, () => ({ score: { cp: 20 }, best: null, pv: [], second: null, legalMoves: 20 }))

describe('commentsForGame', () => {
  const plies = game(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'O-O', 'Nf6'])
  const base = { plies, positions: flat(plies.length), labels: plies.map((): MoveLabel | null => null), seed: 'g1' }

  it('모든 수에 한마디씩, 0번은 null', () => {
    const out = commentsForGame(base)
    expect(out[0]).toBeNull()
    for (let i = 1; i < plies.length; i++) expect(out[i]?.text.length).toBeGreaterThan(0)
  })
  it('같은 입력이면 같은 문장', () => {
    expect(commentsForGame(base).map((c) => c?.text)).toEqual(commentsForGame(base).map((c) => c?.text))
  })
  it('바로 이어지는 두 수에 같은 문장을 쓰지 않는다', () => {
    const texts = commentsForGame(base).map((c) => c?.text)
    for (let i = 2; i < texts.length; i++) expect(texts[i]).not.toBe(texts[i - 1])
  })
  it('금칙어가 없다', () => {
    for (const c of commentsForGame(base)) for (const b of BANNED) expect(c?.text ?? '').not.toMatch(b)
  })
  it('캐슬링 코멘트는 킹 안전을 말한다', () => {
    expect(commentsForGame(base)[7]?.facts).toContain('castle')
  })
})

function from(fen: string, sans: string[]): Ply[] {
  const c = new Chess(fen)
  const out: Ply[] = [{ san: null, uci: null, fen }]
  for (const s of sans) {
    const m = c.move(s)
    out.push({ san: m.san, uci: m.from + m.to + (m.promotion ?? ''), fen: c.fen() })
  }
  return out
}
const at = (score: ReviewedPosition['score']): ReviewedPosition => ({ score, best: null, pv: [], second: null, legalMoves: 20 })

describe('commentFor 고르기', () => {
  it('체크메이트에는 메이트만 말한다', () => {
    const plies = from('6k1/5ppp/8/8/8/8/8/3R2K1 w - - 0 1', ['Rd8#'])
    expect(commentFor({ plies, positions: [at({ cp: 0 }), at({ cp: 10000 })], labels: [null, 'best'], index: 1, seed: 's' })?.facts).toEqual(['mate'])
  })
  it('상대의 메이트 위협은 둔 수 이야기 뒤에 온다', () => {
    const plies = from('k7/8/8/8/8/2P5/2r5/4K3 b - - 0 1', ['Rxc3'])
    const c = commentFor({ plies, positions: [at({ cp: 0 }), at({ mate: 3 })], labels: [null, 'best'], index: 1, seed: 's' })
    expect(c?.facts.slice(0, 2)).toEqual(['capture', 'mateThreat'])
  })
})

describe('문장 틀', () => {
  const samples: Fact[] = [
    { kind: 'mate' },
    { kind: 'check' },
    { kind: 'capture', piece: 'n', captured: 'r', square: 'e5' },
    { kind: 'recapture', square: 'd4' },
    { kind: 'trade', piece: 'b' },
    { kind: 'promotion', to: 'q' },
    { kind: 'castle', long: true },
    { kind: 'develop', piece: 'n' },
    { kind: 'centerPawn', square: 'e4' },
    { kind: 'fork', piece: 'n', square: 'c7', targets: ['k', 'r'] },
    { kind: 'pin', pinned: 'n', square: 'c6', behind: 'k' },
    { kind: 'hanging', piece: 'b', square: 'g5' },
    { kind: 'rookFile', file: 'e', open: true },
    { kind: 'kingShield' },
    { kind: 'missed', bestSan: 'Rxd5', gain: 'material', amount: 9 },
    { kind: 'missed', bestSan: 'Qh7#', gain: 'mate', amount: 1 },
    { kind: 'missed', bestSan: 'Nf3', gain: 'advantage', amount: 0 },
    { kind: 'refutation', target: 'q', square: 'd1', san: 'Bxd1' },
    { kind: 'refutation', target: 'r', square: 'a8', san: null },
    { kind: 'mateThreat', forWhite: false, inMoves: 3 },
    { kind: 'band', from: 'equal', to: 'blackBetter' },
  ]
  const lines: string[] = []
  for (const ctx of [{ mover: '백', enemy: '흑' }, { mover: '흑', enemy: '백' }] as const) {
    for (const f of samples) for (const p of PHRASES[f.kind] as ((f: Fact, c: typeof ctx) => string)[]) lines.push(p(f, ctx))
    for (const q of QUIET) lines.push(q(ctx))
  }

  it('사실마다 틀이 3개 이상', () => {
    for (const list of Object.values(PHRASES)) expect(list.length).toBeGreaterThanOrEqual(3)
  })
  it('조사가 받침과 맞는다', () => {
    for (const line of lines) expect(line).not.toMatch(WRONG_JOSA)
  })
  it('메이트 위협은 어느 쪽 메이트인지 말한다', () => {
    for (const p of PHRASES.mateThreat) {
      expect(p({ kind: 'mateThreat', forWhite: false, inMoves: 2 }, { mover: '백', enemy: '흑' })).toMatch(/흑/)
      expect(p({ kind: 'mateThreat', forWhite: true, inMoves: 2 }, { mover: '흑', enemy: '백' })).toMatch(/백/)
    }
  })
  it('금칙어가 없다', () => {
    for (const line of lines) for (const b of BANNED) expect(line).not.toMatch(b)
  })
})
