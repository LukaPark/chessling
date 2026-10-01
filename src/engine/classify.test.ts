import { describe, expect, it } from 'vitest'
import { formatScore, gameAccuracy, MATED_CP, moveAccuracy, toWhitePov, winPercent } from './classify'

describe('winPercent (Lichess 공식)', () => {
  it('기준값', () => {
    expect(winPercent({ cp: 0 })).toBe(50)
    expect(winPercent({ cp: 1000 })).toBeCloseTo(97.54, 1)
    expect(winPercent({ cp: -100 })).toBeCloseTo(40.9, 1)
  })
  it('±1000cp에서 잘린다', () => {
    expect(winPercent({ cp: 2000 })).toBe(winPercent({ cp: 1000 }))
  })
  it('대칭', () => {
    expect(winPercent({ cp: -300 })).toBeCloseTo(100 - winPercent({ cp: 300 }), 10)
  })
  it('메이트', () => {
    expect(winPercent({ mate: 3 })).toBe(100)
    expect(winPercent({ mate: -2 })).toBe(0)
  })
  it('종국 메이트 점수(±MATED_CP)는 100/0', () => {
    expect(winPercent({ cp: MATED_CP })).toBe(100)
    expect(winPercent({ cp: -MATED_CP })).toBe(0)
  })
})

describe('toWhitePov', () => {
  it('흑 차례면 부호를 뒤집는다', () => {
    expect(toWhitePov({ cp: 30 }, 'b')).toEqual({ cp: -30 })
    expect(toWhitePov({ cp: 0 }, 'b')).toEqual({ cp: 0 })
    expect(toWhitePov({ mate: 2 }, 'b')).toEqual({ mate: -2 })
    expect(toWhitePov({ cp: 30 }, 'w')).toEqual({ cp: 30 })
  })
  it('mate 0은 두는 쪽이 진 포지션', () => {
    expect(toWhitePov({ mate: 0 }, 'w')).toEqual({ cp: -MATED_CP })
    expect(toWhitePov({ mate: 0 }, 'b')).toEqual({ cp: MATED_CP })
  })
})

describe('moveAccuracy', () => {
  it('나빠지지 않으면 100', () => {
    expect(moveAccuracy(50, 50)).toBe(100)
    expect(moveAccuracy(60, 70)).toBe(100)
  })
  it('Lichess 공식', () => {
    expect(moveAccuracy(50, 40)).toBeCloseTo(64.58, 1)
  })
})

describe('gameAccuracy', () => {
  it('평가가 변하지 않으면 양쪽 100', () => {
    expect(gameAccuracy(Array(11).fill({ cp: 0 }), 'w')).toEqual({ white: 100, black: 100 })
  })
  it('백만 블런더하면 백이 더 낮다', () => {
    const scores = [0, 0, 0, -500, -500, -500, -500, -500, -500].map((cp) => ({ cp }))
    const acc = gameAccuracy(scores, 'w')
    expect(acc.black).toBe(100)
    expect(acc.white!).toBeLessThan(100)
  })
  it('흑부터 시작하고 한 수뿐이면 백은 null', () => {
    expect(gameAccuracy([{ cp: 0 }, { cp: 0 }], 'b')).toEqual({ white: null, black: 100 })
  })
  it('메이트로 끝난 대국에서 메이트 수는 감점하지 않는다', () => {
    // 백: 0→0, 메이트 1수 → 종국 메이트. 흑: 평가 유지
    const scores = [{ cp: 0 }, { cp: 0 }, { mate: 1 }, { cp: MATED_CP }]
    expect(gameAccuracy(scores, 'w').white).toBe(100)
  })
  it('수가 없으면 null', () => {
    expect(gameAccuracy([{ cp: 0 }], 'w')).toEqual({ white: null, black: null })
  })
})

describe('formatScore', () => {
  it('표기', () => {
    expect(formatScore({ cp: 123 })).toBe('+1.23')
    expect(formatScore({ cp: -50 })).toBe('-0.50')
    expect(formatScore({ cp: 0 })).toBe('0.00')
    expect(formatScore({ mate: 3 })).toBe('M3')
    expect(formatScore({ mate: -2 })).toBe('-M2')
    expect(formatScore({ cp: MATED_CP })).toBe('#')
  })
})
