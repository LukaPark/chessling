import { describe, expect, it } from 'vitest'
import { guideToken, parseGuide, parseGuideToken } from './guideNotation'

describe('guideNotation', () => {
  it('네 가지 표기를 읽는다', () => {
    expect(parseGuideToken('d3h7')).toEqual({ kind: 'attack', from: 'd3', to: 'h7' })
    expect(parseGuideToken('h7')).toEqual({ kind: 'danger', to: 'h7' })
    expect(parseGuideToken('!d3h7')).toEqual({ kind: 'danger', from: 'd3', to: 'h7' })
    expect(parseGuideToken('?e2e4')).toEqual({ kind: 'missed', from: 'e2', to: 'e4' })
  })
  it('잘못된 표기는 null, 목록에서는 버린다', () => {
    for (const t of ['', 'i9', '!h7', '?h7', 'd3h7q', 'D3H7', 'd3-h7']) expect(parseGuideToken(t)).toBeNull()
    expect(parseGuide(['d3h7', 'zz', 'h7'])).toEqual([{ kind: 'attack', from: 'd3', to: 'h7' }, { kind: 'danger', to: 'h7' }])
  })
  it('역변환', () => {
    for (const t of ['d3h7', 'h7', '!d3h7', '?e2e4']) expect(guideToken(parseGuideToken(t)!)).toBe(t)
  })
})
