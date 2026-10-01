import { Chess } from 'chess.js'
import { describe, expect, it } from 'vitest'
import type { Ply } from '../chess/types'
import type { MoveLabel } from '../engine/judge'
import type { GameReview, ReviewedPosition } from '../engine/review'
import { QUIZ_MAX_STEPS, selectScenes } from './selectScenes'

function game(sans: string[]): Ply[] {
  const c = new Chess()
  const out: Ply[] = [{ san: null, uci: null, fen: c.fen() }]
  for (const s of sans) {
    const m = c.move(s)
    out.push({ san: m.san, uci: m.from + m.to, fen: c.fen() })
  }
  return out
}
function review(plies: Ply[], labels: (MoveLabel | null)[], onlyMove: boolean[], cps: number[]): GameReview {
  const positions: ReviewedPosition[] = plies.map((p, i) => ({
    score: { cp: cps[i] ?? 0 },
    best: plies[i + 1]?.uci ?? null,
    pv: plies.slice(i + 1, i + 6).map((x) => x.uci!),
    second: onlyMove[i] ? { cp: (cps[i] ?? 0) - 600 } : { cp: cps[i] ?? 0 },
    legalMoves: 20,
  }))
  return { version: 2, depth: 14, positions, labels, accuracy: { white: null, black: null } }
}

describe('selectScenes', () => {
  const plies = game(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nd4', 'Nxe5', 'Qg5', 'Nxf7', 'Qxg2'])
  const none = () => plies.map((): MoveLabel | null => null)

  it('승부처가 없으면 장면 없음', () => {
    expect(selectScenes(plies, review(plies, none(), [], []), null)).toEqual([])
  })
  it('좋은 수 앞의 외길 빌드업부터 시작한다', () => {
    const labels = none()
    labels[9] = 'great' // 5. Nxf7
    const only = plies.map(() => false)
    only[6] = true // 4. Nxe5 직전 포지션(백 차례)이 외길
    only[8] = true
    const scenes = selectScenes(plies, review(plies, labels, only, plies.map(() => 200)), null)
    expect(scenes).toHaveLength(1)
    expect(scenes[0]).toMatchObject({ startPly: 6, side: 'w', source: 'auto' })
    expect(scenes[0].steps.map((s) => s.answerUci)).toEqual([plies[7].uci, plies[9].uci])
    expect(scenes[0].steps[0].replyUci).toBe(plies[8].uci)
  })
  it('외길이 없으면 승부처 바로 전 한 수짜리', () => {
    const labels = none()
    labels[8] = 'blunder' // 4... Qg5 (흑)
    const s = selectScenes(plies, review(plies, labels, [], plies.map(() => 0)), null)
    expect(s[0]).toMatchObject({ startPly: 7, side: 'b' })
    expect(s[0].steps).toHaveLength(1)
  })
  it('사용자 쪽만', () => {
    const labels = none()
    labels[8] = 'blunder'
    expect(selectScenes(plies, review(plies, labels, [], []), 'w')).toEqual([])
  })
  it('사용자 수는 최대 4개', () => {
    const labels = none()
    labels[9] = 'great'
    const s = selectScenes(plies, review(plies, labels, plies.map(() => true), plies.map(() => 200)), null)
    expect(s[0].steps.length).toBeLessThanOrEqual(QUIZ_MAX_STEPS)
  })

  describe('실수 직전이 외길이면 엔진 수순으로 늘린다', () => {
    function withPv(pvLength: number) {
      const labels = none()
      labels[8] = 'blunder'
      const r = review(plies, labels, [], plies.map(() => 0))
      // 7번 포지션은 흑 차례. 백 기준 +600인 2순위 수는 흑에게 크게 나쁘다 → 외길
      r.positions[7].second = { cp: 600 }
      r.positions[7].pv = [plies[8].uci!, 'a1a2', 'a2a3', 'a3a4', 'a4a5', 'a5a6'].slice(0, pvLength)
      return selectScenes(plies, r, null)[0]
    }
    it('pv 5수면 3단계, 마지막 단계는 응수 없음', () => {
      const s = withPv(5)
      expect(s.steps).toHaveLength(3)
      expect(s.steps.at(-1)?.replyUci).toBeUndefined()
      expect(s.steps[0].replyUci).toBe('a1a2')
    })
    it('pv 4수(짝수)여도 마지막 단계에 응수를 남기지 않는다', () => {
      const s = withPv(4)
      expect(s.steps).toHaveLength(2)
      expect(s.steps.at(-1)?.replyUci).toBeUndefined()
    })
  })

  it('질문 문구의 조사가 맞다', () => {
    const labels = none()
    labels[8] = 'blunder'
    labels[9] = 'great'
    const only = plies.map(() => false)
    only[6] = true
    const prompts = selectScenes(plies, review(plies, labels, only, plies.map(() => 200)), null).map((s) => s.prompt)
    expect(prompts.length).toBeGreaterThan(0)
    for (const p of prompts) expect(p).not.toMatch(/(백|흑)(가|는)(?![가-힣])/)
  })
})
