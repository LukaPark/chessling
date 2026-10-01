import { describe, expect, it } from 'vitest'
import { MATED_CP } from './classify'
import { countJudgments, JUDGMENT_META, judgeMove, MOVE_LABELS, type JudgeInput } from './judge'

const base: JudgeInput = {
  before: { cp: 0 },
  after: { cp: 0 },
  mover: 'w',
  playedUci: 'e2e4',
  bestUci: 'e2e4',
  secondBefore: { cp: 0 },
  legalMoves: 20,
  sacrifice: false,
  previousLabel: null,
}
const j = (over: Partial<JudgeInput>) => judgeMove({ ...base, ...over })

describe('judgeMove', () => {
  it('둘 수 있는 수가 하나뿐이면 판정 없음', () => {
    expect(j({ legalMoves: 1 })).toBeNull()
  })

  it('탁월: 희생 + 최선 + 두기 전 90% 미만 + 둔 뒤 50% 이상', () => {
    expect(j({ sacrifice: true })).toBe('brilliant')
  })
  it('탁월: 최선이 아니어도 2%p 이내면 인정', () => {
    // w(50)=54.6, w(40)=53.7 → 손실 0.9
    expect(j({ sacrifice: true, playedUci: 'd2d4', before: { cp: 50 }, after: { cp: 40 } })).toBe('brilliant')
  })
  it('탁월 아님: 둔 뒤 50% 미만이면 최선으로', () => {
    expect(j({ sacrifice: true, after: { cp: -100 } })).toBe('best')
  })
  it('탁월 아님: 이미 90% 이상 이기고 있으면 최선으로', () => {
    expect(j({ sacrifice: true, before: { cp: 800 }, after: { cp: 800 }, secondBefore: { cp: 800 } })).toBe('best')
  })

  it('좋은 수: 최선이고 2순위보다 10%p 이상 높은 유일한 수', () => {
    expect(j({ secondBefore: { cp: -300 } })).toBe('great')
    expect(j({ secondBefore: { cp: -20 } })).toBe('best')
  })
  it('좋은 수: 흑 기준으로도 계산한다', () => {
    expect(j({ mover: 'b', playedUci: 'e7e5', bestUci: 'e7e5', secondBefore: { cp: 300 } })).toBe('great')
  })
  it('좋은 수 아님: 이미 결정된 포지션(두기 전 90% 이상)이면 최선', () => {
    expect(j({ before: { mate: 3 }, after: { mate: 2 }, secondBefore: { cp: 0 } })).toBe('best')
  })
  it('좋은 수 아님: 동등한 포지션의 되잡기는 최선', () => {
    expect(j({ secondBefore: { cp: -300 }, isRecapture: true })).toBe('best')
  })
  it('다른 메이트 1수(엔진 1순위 아님)는 최선급으로 본다', () => {
    const label = j({ before: { mate: 1 }, after: { cp: MATED_CP }, playedUci: 'h5f7', bestUci: 'c4f7', secondBefore: { mate: 1 } })
    expect(['best', 'excellent']).toContain(label)
  })
  it('2순위 정보가 없으면 최선', () => {
    expect(j({ secondBefore: null })).toBe('best')
  })

  it('손실 구간', () => {
    const other = { playedUci: 'a2a3' }
    expect(j({ ...other, after: { cp: -10 } })).toBe('excellent') // 0.9
    expect(j({ ...other, after: { cp: -30 } })).toBe('good') // 2.8
    expect(j({ ...other, after: { cp: -100 } })).toBe('inaccuracy') // 9.1
    expect(j({ ...other, after: { cp: -130 } })).toBe('mistake') // 11.7
    expect(j({ ...other, after: { cp: -200 } })).toBe('blunder') // 17.6
  })
  it('흑은 반대 방향', () => {
    expect(j({ mover: 'b', playedUci: 'a7a6', bestUci: 'e7e5', after: { cp: 200 } })).toBe('blunder')
    expect(j({ mover: 'b', playedUci: 'a7a6', bestUci: 'e7e5', after: { cp: -200 } })).toBe('excellent')
  })

  it('놓침: 직전 상대 수가 실수·블런더인데 손실 10%p 이상', () => {
    expect(j({ playedUci: 'a2a3', after: { cp: -130 }, previousLabel: 'blunder' })).toBe('miss')
    expect(j({ playedUci: 'a2a3', after: { cp: -200 }, previousLabel: 'mistake' })).toBe('miss')
    expect(j({ playedUci: 'a2a3', after: { cp: -100 }, previousLabel: 'blunder' })).toBe('inaccuracy')
    expect(j({ playedUci: 'a2a3', after: { cp: -130 }, previousLabel: 'inaccuracy' })).toBe('mistake')
  })
})

describe('JUDGMENT_META', () => {
  it('모든 판정에 한국어 이름과 기호가 있다', () => {
    expect(MOVE_LABELS).toHaveLength(9)
    for (const l of MOVE_LABELS) expect(JUDGMENT_META[l].name.length).toBeGreaterThan(0)
    expect(JUDGMENT_META.brilliant).toEqual({ name: '탁월', glyph: '!!' })
    expect(JUDGMENT_META.best.glyph).toBe('★')
    expect(JUDGMENT_META.excellent.glyph).toBe('')
    expect(JUDGMENT_META.blunder).toEqual({ name: '블런더', glyph: '??' })
  })
})

describe('countJudgments', () => {
  it('수를 둔 쪽별로 센다', () => {
    const counts = countJudgments([null, 'best', 'blunder', 'brilliant', null], 'w')
    expect(counts.white.best).toBe(1)
    expect(counts.white.brilliant).toBe(1)
    expect(counts.black.blunder).toBe(1)
    expect(counts.black.best).toBe(0)
  })
  it('흑부터 시작하는 포지션', () => {
    expect(countJudgments([null, 'miss'], 'b').black.miss).toBe(1)
  })
})
