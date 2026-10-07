import { Chess } from 'chess.js'
import { describe, expect, it } from 'vitest'
import type { Ply, Result } from '../../chess/types'
import { BANNED } from '../../data/annotations/validate'
import type { MoveLabel } from '../judge'
import type { GameReview } from '../review'
import { classifyGame, summarizeGame, type GameSummaryText } from './summary'

const SHUFFLE = ['Nc3', 'Nc6', 'Nb1', 'Nb8']

function game(sans: string[]): Ply[] {
  const c = new Chess()
  const out: Ply[] = [{ san: null, uci: null, fen: c.fen() }]
  for (const s of sans) {
    const m = c.move(s)
    out.push({ san: m.san, uci: m.from + m.to + (m.promotion ?? ''), fen: c.fen() })
  }
  return out
}
/** 나이트를 왔다 갔다 하는 n수(ply) */
const shuffle = (n: number, offset = 0) => Array.from({ length: n }, (_, i) => SHUFFLE[(i + offset) % 4])

/** cps[i]: i번째 포지션의 백 기준 점수. labels는 {ply: label} */
function review(cps: number[], labels: Record<number, MoveLabel> = {}): GameReview {
  return {
    version: 2,
    depth: 14,
    positions: cps.map((cp) => ({ score: { cp }, best: null, pv: [], second: null, legalMoves: 20 })),
    labels: cps.map((_, i) => (i === 0 ? null : (labels[i] ?? 'good'))),
    accuracy: { white: null, black: null },
  }
}
/** ply 수만큼 점수를 채운다: segments [끝 ply(포함), cp] */
function curve(n: number, segments: [number, number][]): number[] {
  return Array.from({ length: n + 1 }, (_, i) => segments.find(([end]) => i <= end)?.[1] ?? segments.at(-1)![1])
}

function run(n: number, segments: [number, number][], labels: Record<number, MoveLabel>, result: Result, mySide?: 'w' | 'b' | null, sans?: string[]) {
  const plies = game(sans ?? shuffle(n))
  const input = { review: review(curve(plies.length - 1, segments), labels), plies, result, mySide }
  return { kind: classifyGame(input)?.kind, text: summarizeGame(input) }
}

// ply 45 = 23수째 백의 수, ply 46 = 23수째 흑의 수
describe('classifyGame', () => {
  it('팽팽하다가 한 번의 블런더로 갈린 판은 전환점', () => {
    const r = run(60, [[44, 20], [60, -600]], { 45: 'blunder' }, '0-1')
    expect(r.kind).toBe('turning')
    expect(r.text?.headline).toMatch(/23수째/)
  })
  it('이긴 쪽이 크게 밀렸던 적이 있으면 역전', () => {
    const r = run(70, [[20, 0], [40, 600], [60, 300], [70, -700]], { 61: 'blunder' }, '0-1')
    expect(r.kind).toBe('comeback')
  })
  it('내가 진 역전이면 역전패', () => {
    const r = run(70, [[20, 0], [40, 600], [60, 300], [70, -700]], { 61: 'blunder' }, '0-1', 'w')
    expect(r.kind).toBe('comebackLoss')
    expect(r.text?.headline + ' ' + r.text?.line).toMatch(/31수째/)
  })
  it('내가 이긴 역전이면 나의 역전승', () => {
    const r = run(70, [[20, 0], [40, 600], [60, 300], [70, -700]], { 61: 'blunder' }, '0-1', 'b')
    expect(r.kind).toBe('comeback')
    expect(r.text?.headline).toMatch(/나의|내/)
    expect(r.text?.headline + r.text!.line).not.toMatch(/백|흑/)
  })
  it('초반에 잡은 우세를 끝까지 지키면 완승', () => {
    const r = run(60, [[10, 30], [20, 300], [60, 900]], {}, '1-0')
    expect(r.kind).toBe('dominant')
  })
  it('체크메이트로 끝난 완승은 체크메이트가 제목', () => {
    const sans = [...shuffle(16), 'e4', 'e5', 'Qh5', 'Nc6', 'Bc4', 'Nf6', 'Qxf7#']
    const r = run(sans.length, [[8, 30], [22, 400], [100, 10000]], {}, '1-0', null, sans)
    expect(r.kind).toBe('mate')
    expect(r.text?.headline).toMatch(/12수/)
    expect(r.text?.headline).toMatch(/체크메이트/)
  })
  it('다른 이야기가 더 클 때 체크메이트는 설명에 붙인다', () => {
    const sans = [...shuffle(40), 'e4', 'e5', 'Qh5', 'Nc6', 'Bc4', 'Nf6', 'Qxf7#']
    const r = run(sans.length, [[10, 0], [30, -600], [41, -300], [100, 10000]], { 42: 'blunder' }, '1-0', null, sans)
    expect(r.kind).toBe('comeback')
    expect(r.text?.line).toMatch(/체크메이트/)
  })
  it('실수가 없는 무승부는 빈틈없는 무승부', () => {
    const r = run(60, [[60, 10]], {}, '1/2-1/2')
    expect(r.kind).toBe('cleanDraw')
  })
  it('실수가 있었던 무승부', () => {
    const r = run(60, [[31, 10], [41, 300], [60, 0]], { 32: 'mistake', 42: 'mistake' }, '1/2-1/2')
    expect(r.kind).toBe('messyDraw')
    expect(r.text?.line).toMatch(/16수째/)
  })
  it('양쪽이 여러 번 실수하면 난타전', () => {
    const r = run(80, [[20, 0], [30, 200], [40, -100], [50, 250], [60, 0], [80, -500]], { 21: 'mistake', 32: 'mistake', 41: 'mistake', 52: 'blunder', 61: 'blunder' }, '0-1')
    expect(r.kind).toBe('slugfest')
    expect(r.text?.headline).toMatch(/흑/)
  })
  it('진행 중이면 지금 우세한 쪽과 최근 실수', () => {
    const r = run(40, [[37, 0], [40, 500]], { 38: 'mistake' }, '*')
    expect(r.kind).toBe('inProgress')
    expect(r.text?.headline).toBe('진행 중 · 지금은 백 우세')
    expect(r.text?.line).toBe('19수째 흑의 실수 뒤로 백이 앞서 있어요.')
  })
  it('진행 중이고 비슷하면 팽팽해요', () => {
    const r = run(40, [[40, 20]], {}, '*')
    expect(r.text?.headline).toBe('진행 중 · 팽팽해요')
  })
  it('진행 중, 내 쪽 시점', () => {
    const r = run(40, [[37, 0], [40, 500]], { 38: 'mistake' }, '*', 'w')
    expect(r.text?.headline).toBe('진행 중 · 지금은 내 우세')
    expect(r.text?.line).toBe('19수째 상대의 실수 뒤로 내가 앞서 있어요.')
  })
  it('수가 거의 없으면 null', () => {
    expect(summarizeGame({ review: review([0]), plies: game([]), result: '*' })).toBeNull()
    expect(summarizeGame({ review: review([0, 0]), plies: game(['e4']), result: '*' })).toBeNull()
  })
  it('같은 대국이면 같은 문장', () => {
    const a = run(60, [[44, 20], [60, -600]], { 45: 'blunder' }, '0-1')
    const b = run(60, [[44, 20], [60, -600]], { 45: 'blunder' }, '0-1')
    expect(a.text).toEqual(b.text)
  })
})

describe('문장 규칙', () => {
  const cases: [string, ReturnType<typeof run>][] = []
  for (const side of [null, 'w', 'b'] as const) {
    for (const len of [60, 61, 62, 64]) {
      cases.push(
        ['turning', run(len, [[44, 20], [len, -600]], { 45: 'blunder' }, '0-1', side)],
        ['turning-w', run(len, [[45, 20], [len, 600]], { 46: 'mistake' }, '1-0', side)],
        ['comeback', run(len + 10, [[20, 0], [40, 600], [60, 300], [len + 10, -700]], { 61: 'blunder' }, '0-1', side)],
        ['dominant', run(len, [[10, 30], [20, 300], [len, 900]], {}, '1-0', side)],
        ['dominant-b', run(len, [[10, 30], [20, -300], [len, -900]], {}, '0-1', side)],
        ['decisive', run(len, [[50, 0], [len, 400]], {}, '1-0', side)],
        ['cleanDraw', run(len, [[len, 10]], {}, '1/2-1/2', side)],
        ['messyDraw', run(len, [[31, 10], [41, 300], [len, 0]], { 32: 'mistake', 42: 'mistake' }, '1/2-1/2', side)],
        ['slugfest', run(len + 20, [[20, 0], [30, 200], [40, -100], [50, 250], [60, 0], [len + 20, -500]], { 21: 'mistake', 32: 'mistake', 41: 'mistake', 52: 'blunder', 61: 'blunder' }, '0-1', side)],
        ['inProgress', run(len, [[len - 3, 0], [len, 500]], { [len - 2]: 'mistake' }, '*', side)],
        ['inProgress-even', run(len, [[len, 0]], {}, '*', side)],
      )
    }
    const sans = [...shuffle(16), 'e4', 'e5', 'Qh5', 'Nc6', 'Bc4', 'Nf6', 'Qxf7#']
    cases.push(['mate', run(sans.length, [[8, 30], [22, 400], [100, 10000]], {}, '1-0', side, sans)])
    const fool = ['f3', 'e5', 'g4', 'Qh4#']
    cases.push(['fool', run(fool.length, [[2, 0], [4, -10000]], { 3: 'blunder' }, '0-1', side, fool)])
  }

  it.each(cases)('%s: 수 번호 말고는 숫자가 없고, 금칙어·길이·호칭을 지킨다', (_, r) => {
    const t = r.text as GameSummaryText
    expect(t).not.toBeNull()
    for (const s of [t.headline, t.line]) {
      expect(s.replace(/\d+수/g, '')).not.toMatch(/\d/)
      expect(s).not.toMatch(/%/)
      for (const b of BANNED) expect(s).not.toMatch(b)
      // 받침과 맞지 않는 조사
      expect(s).not.toMatch(/(백|흑)(가|는|를|와|로)(?![가-힣])|(수|더)(이|은|을|과|으로)(?![가-힣])|(?<![가-힣])나(가|를) /)
    }
    expect(t.headline.length).toBeLessThanOrEqual(24)
    expect(t.line.length).toBeLessThanOrEqual(60)
    expect(t.line).toMatch(/요\.$/)
  })

  it('내 시점이면 백/흑 대신 나/상대', () => {
    const mine = run(60, [[44, 20], [60, -600]], { 45: 'blunder' }, '0-1', 'w').text!
    expect(mine.headline + mine.line).not.toMatch(/백|흑/)
    const theirs = run(60, [[44, 20], [60, -600]], { 45: 'blunder' }, '0-1', null).text!
    expect(theirs.headline + theirs.line).not.toMatch(/나의|내 |상대/)
  })

  it('대국마다 문장이 한 가지로만 나오지 않는다', () => {
    const lines = new Set([60, 61, 62, 63, 64, 66, 68].map((n) => run(n, [[10, 30], [20, 300], [n, 900]], {}, '1-0').text!.headline))
    expect(lines.size).toBeGreaterThan(1)
  })
})

it('그냥 이긴 판은 이긴 쪽이 앞서 나간 수를 고비로 본다', () => {
  const plies = game(shuffle(60))
  const input = { review: review(curve(60, [[50, 0], [60, 400]])), plies, result: '1-0' as const }
  expect(classifyGame(input)).toMatchObject({ kind: 'decisive', ply: 51 })
})
