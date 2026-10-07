import { Chess } from 'chess.js'
import { describe, expect, it } from 'vitest'
import type { Ply, Result } from '../../chess/types'
import { BANNED } from '../../data/annotations/validate'
import type { MoveLabel } from '../judge'
import type { GameReview } from '../review'
import { classifyGame, HEADLINES, shapeOf, summarizeGame, type GameSummaryText, type SummaryInput } from './summary'

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
function input(n: number, segments: [number, number][], labels: Record<number, MoveLabel>, result: Result, mySide?: 'w' | 'b' | null, sans?: string[]): SummaryInput {
  const plies = game(sans ?? shuffle(n))
  return { review: review(curve(plies.length - 1, segments), labels), plies, result, mySide }
}
function run(n: number, segments: [number, number][], labels: Record<number, MoveLabel>, result: Result, mySide?: 'w' | 'b' | null, sans?: string[]) {
  const i = input(n, segments, labels, result, mySide, sans)
  return { kind: classifyGame(i)?.kind, shape: shapeOf(i), text: summarizeGame(i) }
}

const SCHOLAR = [...shuffle(16), 'e4', 'e5', 'Qh5', 'Nc6', 'Bc4', 'Nf6', 'Qxf7#']
/** 34수째 메이트 */
const LONG_MATE = [...shuffle(60), 'e4', 'e5', 'Qh5', 'Nc6', 'Bc4', 'Nf6', 'Qxf7#']

// ply 45 = 23수째 백의 수, ply 46 = 23수째 흑의 수
describe('classifyGame', () => {
  it('팽팽하다가 한 번의 블런더로 갈리면 전환점', () => {
    expect(classifyGame(input(60, [[44, 20], [60, -600]], { 45: 'blunder' }, '0-1'))).toMatchObject({ kind: 'turning', ply: 45 })
  })
  it('이긴 쪽이 크게 밀렸고 진 쪽의 실수로 뒤집히면 역전, 내가 졌으면 역전패', () => {
    const c = [[20, 0], [40, 600], [60, 300], [70, -700]] as [number, number][]
    expect(classifyGame(input(70, c, { 61: 'blunder' }, '0-1'))?.kind).toBe('comeback')
    expect(classifyGame(input(70, c, { 61: 'blunder' }, '0-1', 'w'))?.kind).toBe('comebackLoss')
    expect(classifyGame(input(70, c, {}, '0-1'))?.kind).not.toMatch(/comeback/)
  })
  it('초반에 잡은 우세를 끝까지 지키면 완승, 흔들렸으면 깔끔하지 않은 완승', () => {
    expect(classifyGame(input(60, [[10, 30], [20, 300], [60, 900]], {}, '1-0'))).toMatchObject({ kind: 'dominant', flawless: true })
    expect(classifyGame(input(60, [[10, 30], [20, 300], [30, -50], [60, 900]], {}, '1-0'))).toMatchObject({ kind: 'dominant', flawless: false })
    expect(classifyGame(input(60, [[10, -250], [20, 300], [60, 900]], {}, '1-0'))?.kind).not.toBe('dominant')
  })
  it('체크메이트로 끝난 완승은 메이트', () => {
    expect(classifyGame(input(0, [[8, 30], [22, 400], [100, 10000]], {}, '1-0', null, SCHOLAR))?.kind).toBe('mate')
  })
  it('무승부: 실수 없고 균형 / 실수 / 큰 우세가 있었던 무승부', () => {
    expect(classifyGame(input(60, [[60, 10]], {}, '1/2-1/2'))?.kind).toBe('cleanDraw')
    expect(classifyGame(input(60, [[31, 10], [41, 300], [60, 0]], { 32: 'mistake' }, '1/2-1/2'))?.kind).toBe('messyDraw')
    expect(classifyGame(input(60, [[30, 0], [40, 700], [60, 0]], {}, '1/2-1/2'))?.kind).toBe('draw')
  })
  it('양쪽이 여러 번 실수하면 난타전, 고비는 진 쪽이 가장 크게 잃은 수', () => {
    const i = input(80, [[20, 0], [30, 200], [40, -400], [50, 250], [60, -300], [70, -400], [80, -600]], { 31: 'blunder', 42: 'mistake', 51: 'mistake', 52: 'blunder', 71: 'mistake' }, '0-1')
    expect(classifyGame(i)).toMatchObject({ kind: 'slugfest', ply: 31 })
  })
  it('형세가 결과를 뒷받침하지 않으면 result', () => {
    expect(classifyGame(input(60, [[60, -500]], {}, '1-0'))).toMatchObject({ kind: 'result', shape: 'loserAhead' })
    expect(classifyGame(input(60, [[60, 20]], {}, '0-1'))).toMatchObject({ kind: 'result', shape: 'even' })
  })
  it('흑이 먼저 두는 FEN도 중심 수를 찾는다', () => {
    const fen = 'r3k3/8/8/8/8/8/8/R3K3 b - - 0 30'
    const c = new Chess(fen)
    const plies: Ply[] = [{ san: null, uci: null, fen }]
    for (let i = 0; i < 40; i++) {
      const m = c.move(['Kf7', 'Kf2', 'Ke8', 'Ke1'][i % 4])
      plies.push({ san: m.san, uci: m.from + m.to, fen: c.fen() })
    }
    const i = { review: review(curve(40, [[20, 0], [40, 600]]), { 21: 'blunder' }), plies, result: '1-0' as const }
    expect(classifyGame(i)).toMatchObject({ kind: 'turning', ply: 21 })
    // ply 21 = 40...수
    expect(summarizeGame(i)!.caption).toBe('백 승 · 40수에 갈림')
  })
  it('수가 거의 없으면 null', () => {
    expect(summarizeGame({ review: review([0]), plies: game([]), result: '*' })).toBeNull()
    expect(summarizeGame({ review: review([0, 0]), plies: game(['e4']), result: '*' })).toBeNull()
  })
})

describe('판의 모양', () => {
  it('일찍 잡은 우세를 지킨 판·우세를 지킨 채 짧게 끝난 메이트는 quick', () => {
    expect(run(0, [[8, 30], [22, 400], [100, 10000]], {}, '1-0', null, SCHOLAR).shape).toBe('quick')
    expect(run(60, [[10, 30], [20, 300], [60, 900]], {}, '1-0').shape).toBe('quick')
  })
  it('실수 없이 늦게 앞서 나간 판은 squeeze', () => {
    expect(run(60, [[30, 30], [60, 300]], {}, '1-0').shape).toBe('squeeze')
    expect(run(0, [[50, 30], [60, 400], [100, 10000]], {}, '1-0', null, LONG_MATE).shape).toBe('squeeze')
  })
  it('짧아도 우세가 오간 판은 quick이 아니다', () => {
    const sans = [...shuffle(28), 'e4', 'e5', 'Qh5', 'Nc6', 'Bc4', 'Nf6', 'Qxf7#']
    expect(run(0, [[20, 0], [26, -300], [28, 0], [100, 10000]], { 23: 'mistake', 25: 'mistake' }, '1-0', null, sans).shape).toBe('hardWon')
  })
  it('짧은 판이어도 잡은 우세를 한 번 놓쳤으면 quick이 아니다', () => {
    expect(run(40, [[10, 30], [20, 300], [30, -50], [40, 900]], {}, '1-0').shape).toBe('squeeze')
  })
  it('이긴 쪽도 여러 번 실수했으면 hardWon', () => {
    expect(run(60, [[30, 30], [60, 300]], { 33: 'mistake', 37: 'mistake' }, '1-0').shape).toBe('hardWon')
  })
  it('나머지 모양', () => {
    expect(run(60, [[44, 20], [60, -600]], { 45: 'blunder' }, '0-1').shape).toBe('sudden')
    expect(run(70, [[20, 0], [40, 600], [60, 300], [70, -700]], { 61: 'blunder' }, '0-1').shape).toBe('comeback')
    expect(run(80, [[20, 0], [30, 200], [40, -100], [50, 250], [60, 0], [80, -500]], { 21: 'mistake', 32: 'mistake', 41: 'mistake', 52: 'blunder', 61: 'blunder' }, '0-1').shape).toBe('chaos')
    expect(run(60, [[60, 10]], {}, '1/2-1/2').shape).toBe('tightDraw')
    expect(run(60, [[30, 0], [40, 700], [60, 0]], {}, '1/2-1/2').shape).toBe('messyDraw')
    expect(run(60, [[60, 20]], {}, '0-1').shape).toBe('offBoard')
    expect(run(40, [[40, 0]], {}, '*').shape).toBe('ongoing')
  })
})

describe('한줄평', () => {
  it('제목은 모양과 시점에 맞는 문장 가운데 하나', () => {
    const r = run(60, [[44, 20], [60, -600]], { 45: 'blunder' }, '0-1')
    expect(HEADLINES.sudden.neutral).toContain(r.text!.headline)
    expect(HEADLINES.sudden.won).toContain(run(60, [[44, 20], [60, -600]], { 45: 'blunder' }, '0-1', 'b').text!.headline)
    expect(HEADLINES.sudden.lost).toContain(run(60, [[44, 20], [60, -600]], { 45: 'blunder' }, '0-1', 'w').text!.headline)
    expect(HEADLINES.ongoing.neutral).toContain(run(40, [[40, 0]], {}, '*', 'w').text!.headline)
  })
  it('같은 대국이면 같은 한줄평', () => {
    expect(run(60, [[44, 20], [60, -600]], { 45: 'blunder' }, '0-1').text).toEqual(run(60, [[44, 20], [60, -600]], { 45: 'blunder' }, '0-1').text)
  })
  it('대국이 다르면 같은 모양이어도 문장이 고르게 갈린다', () => {
    const heads = new Set([60, 61, 62, 63, 64, 65, 66, 67, 68, 69].map((n) => run(n, [[44, 20], [n, -600]], { 45: 'blunder' }, '0-1').text!.headline))
    expect(heads.size).toBeGreaterThanOrEqual(4)
  })
  it('문장 묶음마다 다섯 개 이상, 모두 규칙을 지킨다', () => {
    const CLICHE = /난타전|격차를 벌려|한 번도 흔들리지|끝내 가져간|분수령|깔끔|빈틈없|치열한 승부|명승부|드라마|손에 땀|역사에 남|완승/
    for (const [shape, pools] of Object.entries(HEADLINES)) {
      for (const [view, list] of Object.entries(pools) as [string, string[]][]) {
        expect(list.length, `${shape}.${view}`).toBeGreaterThanOrEqual(5)
        for (const h of list) {
          expect(h).not.toMatch(/\d/)
          expect(h.length, h).toBeLessThanOrEqual(40)
          expect(h).not.toMatch(CLICHE)
          for (const b of BANNED) expect(h).not.toMatch(b)
          expect(h).not.toMatch(/백|흑/)
          // 내 시점 문장에만 나/상대
          if (view === 'neutral') expect(h, h).not.toMatch(/(^|\s)(나는|나의|내가|내 |나에게|상대)/)
          expect(h).not.toMatch(/(?<![가-힣])나가 (이겼|졌|앞)/)
        }
      }
    }
  })
})

describe('캡션', () => {
  it('결과와 수 번호만 담는다', () => {
    expect(run(0, [[8, 30], [22, 400], [100, 10000]], {}, '1-0', null, SCHOLAR).text!.caption).toBe('백 승 · 12수 메이트')
    expect(run(60, [[44, 20], [60, -600]], { 45: 'blunder' }, '0-1').text!.caption).toBe('흑 승 · 23수에 갈림')
    expect(run(70, [[20, 0], [40, 600], [60, 300], [70, -700]], { 61: 'blunder' }, '0-1').text!.caption).toBe('흑 승 · 31수에 역전')
    expect(run(60, [[30, 30], [60, 300]], {}, '1-0').text!.caption).toBe('백 승 · 16수부터 우세')
    expect(run(60, [[60, 20]], {}, '0-1').text!.caption).toBe('흑 승')
    expect(run(60, [[60, 10]], {}, '1/2-1/2').text!.caption).toBe('무승부')
    expect(run(40, [[37, 0], [40, 500]], { 38: 'mistake' }, '*').text!.caption).toBe('진행 중 · 지금은 백 우세')
    expect(run(40, [[40, 0]], {}, '*').text!.caption).toBe('진행 중 · 비슷한 형세')
  })
  it('내 시점이면 내 승리 / 내 패배', () => {
    expect(run(60, [[44, 20], [60, -600]], { 45: 'blunder' }, '0-1', 'b').text!.caption).toBe('내 승리 · 23수에 갈림')
    expect(run(60, [[44, 20], [60, -600]], { 45: 'blunder' }, '0-1', 'w').text!.caption).toBe('내 패배 · 23수에 갈림')
    expect(run(40, [[37, 0], [40, 500]], { 38: 'mistake' }, '*', 'w').text!.caption).toBe('진행 중 · 지금은 내 우세')
    expect(run(60, [[60, 10]], {}, '1/2-1/2', 'w').text!.caption).toBe('무승부')
  })
})
