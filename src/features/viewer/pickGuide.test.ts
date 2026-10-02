import { describe, expect, it, vi } from 'vitest'
import type { GuideShape } from '../../engine/comment/guide'
import { pickGuide } from './pickGuide'

const AUTO: GuideShape[] = [
  { kind: 'missed', from: 'e2', to: 'e4' },
  { kind: 'attack', from: 'd3', to: 'h7' },
  { kind: 'danger', to: 'f7' },
]

describe('pickGuide', () => {
  it('직접 지정이 있으면 그것만 쓰고 자동 계산을 하지 않는다', () => {
    const auto = vi.fn(() => AUTO)
    expect(pickGuide({ authored: ['b3b7'], auto, sceneStart: false })).toEqual([{ kind: 'attack', from: 'b3', to: 'b7' }])
    expect(pickGuide({ authored: [], auto, sceneStart: false })).toEqual([])
    expect(auto).not.toHaveBeenCalled()
  })
  it('직접 지정이 없으면 자동', () => {
    expect(pickGuide({ authored: undefined, auto: () => AUTO, sceneStart: false })).toEqual(AUTO)
  })
  it('퀴즈 장면 시작 포지션의 자동 가이드는 노림 화살표만 남긴다', () => {
    expect(pickGuide({ authored: undefined, auto: () => AUTO, sceneStart: true })).toEqual([{ kind: 'attack', from: 'd3', to: 'h7' }])
  })
})
