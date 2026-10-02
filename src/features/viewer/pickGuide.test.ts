import { describe, expect, it, vi } from 'vitest'
import type { GuideShape } from '../../engine/comment/guide'
import { hiddenAnswers, pickGuide } from './pickGuide'

const AUTO: GuideShape[] = [
  { kind: 'missed', from: 'e2', to: 'e4' },
  { kind: 'attack', from: 'd3', to: 'h7' },
  { kind: 'danger', to: 'f7' },
]

describe('pickGuide', () => {
  it('직접 지정이 있으면 그것만 쓰고 자동 계산을 하지 않는다', () => {
    const auto = vi.fn(() => AUTO)
    expect(pickGuide({ authored: ['b3b7'], auto, sceneStart: false, hidden: [] })).toEqual([{ kind: 'attack', from: 'b3', to: 'b7' }])
    expect(pickGuide({ authored: [], auto, sceneStart: false, hidden: [] })).toEqual([])
    expect(auto).not.toHaveBeenCalled()
  })
  it('직접 지정이 없으면 자동', () => {
    expect(pickGuide({ authored: undefined, auto: () => AUTO, sceneStart: false, hidden: [] })).toEqual(AUTO)
  })
  it('퀴즈 장면 시작 포지션의 자동 가이드는 노림 화살표만 남긴다', () => {
    expect(pickGuide({ authored: undefined, auto: () => AUTO, sceneStart: true, hidden: [] })).toEqual([{ kind: 'attack', from: 'd3', to: 'h7' }])
  })
  it('숨길 정답 화살표는 직접 지정에서도 자동에서도 뺀다', () => {
    expect(pickGuide({ authored: ['b3b7', 'e4'], auto: () => AUTO, sceneStart: false, hidden: ['b3b7'] })).toEqual([{ kind: 'danger', to: 'e4' }])
    expect(pickGuide({ authored: undefined, auto: () => AUTO, sceneStart: false, hidden: ['e2e4'] })).toEqual([AUTO[1], AUTO[2]])
  })
  it('칸 표시(from 없음)는 숨기지 않는다', () => {
    expect(pickGuide({ authored: undefined, auto: () => AUTO, sceneStart: false, hidden: ['f7f7', 'e2e4', 'd3h7'] })).toEqual([AUTO[2]])
  })
})

describe('hiddenAnswers', () => {
  const scenes = [
    { startPly: 5, steps: [{ answerUci: 'e2e4' }, { answerUci: 'a1a2' }] },
    { startPly: 8, steps: [{ answerUci: 'g1f3q' }] },
  ]
  it('startPly-2 ~ startPly 구간의 첫 정답만 4글자로 돌려준다', () => {
    expect(hiddenAnswers(scenes, 2)).toEqual([])
    expect(hiddenAnswers(scenes, 3)).toEqual(['e2e4'])
    expect(hiddenAnswers(scenes, 4)).toEqual(['e2e4'])
    expect(hiddenAnswers(scenes, 5)).toEqual(['e2e4'])
    expect(hiddenAnswers(scenes, 6)).toEqual(['g1f3'])
    expect(hiddenAnswers(scenes, 7)).toEqual(['g1f3'])
    expect(hiddenAnswers(scenes, 8)).toEqual(['g1f3'])
    expect(hiddenAnswers(scenes, 9)).toEqual([])
  })
  it('구간에 겹치는 장면은 모두 돌려준다', () => {
    expect(hiddenAnswers(scenes, 6).concat(hiddenAnswers(scenes, 3))).toHaveLength(2)
    expect(hiddenAnswers([{ startPly: 5, steps: [{ answerUci: 'e2e4' }] }, { startPly: 6, steps: [{ answerUci: 'd2d4' }] }], 4)).toEqual(['e2e4', 'd2d4'])
  })
})
