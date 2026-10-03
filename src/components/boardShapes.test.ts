import { describe, expect, it } from 'vitest'
import { guideShape } from './boardShapes'

describe('guideShape', () => {
  it('종류별 색과 화살표/원', () => {
    expect(guideShape({ kind: 'attack', from: 'd3', to: 'h7' })).toEqual({ orig: 'd3', dest: 'h7', brush: 'green' })
    expect(guideShape({ kind: 'danger', to: 'h7' })).toEqual({ orig: 'h7', brush: 'red' })
    expect(guideShape({ kind: 'danger', from: 'd8', to: 'd1' })).toEqual({ orig: 'd8', dest: 'd1', brush: 'red' })
    expect(guideShape({ kind: 'missed', from: 'e2', to: 'e4' })).toEqual({ orig: 'e2', dest: 'e4', brush: 'blue' })
  })
})
