import { describe, expect, it } from 'vitest'
import type { KoOpenings, OpeningEntry } from '../../openings/types'
import index from './index.json'
import ko from './ko.json'
import { validateKoOpenings } from './validate'

const INDEX = index as OpeningEntry[]

const base = (): KoOpenings => JSON.parse(JSON.stringify(ko))

describe('ko.json', () => {
  it('실제 데이터가 검증을 통과한다', () => {
    expect(validateKoOpenings(ko as KoOpenings, INDEX)).toEqual([])
  })
})

describe('validateKoOpenings', () => {
  it('색인에 없는 이름을 잡는다', () => {
    const k = base()
    k.variations['Sicilian Defense: Nonexistent'] = { ...k.variations['Sicilian Defense: Najdorf Variation'] }
    expect(validateKoOpenings(k, INDEX)).toContain('변화 "Sicilian Defense: Nonexistent": 색인에 없는 이름')
  })

  it('둘 수 없는 대표 수순과 변화 포지션을 지나지 않는 수순을 잡는다', () => {
    const k = base()
    k.variations['Sicilian Defense: Najdorf Variation'].line = '1. e4 c5 2. Ke3'
    expect(validateKoOpenings(k, INDEX).some((e) => e.includes('둘 수 없는 수'))).toBe(true)
    k.variations['Sicilian Defense: Najdorf Variation'].line = '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 g6'
    expect(validateKoOpenings(k, INDEX)).toContain('변화 "Sicilian Defense: Najdorf Variation": 대표 수순이 이 변화 포지션을 지나지 않음')
  })

  it('금칙어, 문장 수, 긴 문장, 변화 없는 계열을 잡는다', () => {
    const k = base()
    k.families['Sicilian Defense'].idea = '엔진이 좋아하는 오프닝이에요.'
    k.families['Philidor Defense'].plans.white = '첫 문장이에요. 둘째 문장이에요.'
    for (const v of Object.keys(k.variations)) if (v.startsWith('Philidor Defense:')) delete k.variations[v]
    k.variations['Sicilian Defense: Najdorf Variation'].summary =
      '이 문장은 일부러 아주 길게 써서 한 문장 길이 제한을 넘기도록 만든 시험용 문장이고 끝까지 마침표 없이 이어져요.'
    const errors = validateKoOpenings(k, INDEX)
    expect(errors).toContain('계열 "Sicilian Defense" idea: 금칙어 /엔진/')
    expect(errors).toContain('계열 "Philidor Defense" plans.white: 문장 2개 (1개까지)')
    expect(errors.some((e) => e.includes('summary: 60자 넘는 문장'))).toBe(true)
    expect(errors).toContain('계열 "Philidor Defense": 설명한 변화가 없음')
  })
})
