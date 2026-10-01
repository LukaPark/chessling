import { describe, expect, it } from 'vitest'
import { classicOfTheDay, kstDateString, shuffledOrder } from './daily'

const items = Array.from({ length: 7 }, (_, i) => `g${i}`)
const range = (n: number) => Array.from({ length: n }, (_, i) => i)

describe('kstDateString', () => {
  it('Asia/Seoul 자정을 경계로 날짜가 바뀐다', () => {
    expect(kstDateString(new Date('2026-09-30T14:59:59Z'))).toBe('2026-09-30')
    expect(kstDateString(new Date('2026-09-30T15:00:00Z'))).toBe('2026-10-01')
  })
})

describe('shuffledOrder', () => {
  it('순열이다', () => {
    expect([...shuffledOrder(100)].sort((a, b) => a - b)).toEqual(range(100))
  })
  it('결정적이다', () => {
    expect(shuffledOrder(50)).toEqual(shuffledOrder(50))
  })
  it('시드가 다르면 순서가 다르다', () => {
    expect(shuffledOrder(50, 1)).not.toEqual(shuffledOrder(50, 2))
  })
})

describe('classicOfTheDay', () => {
  it('같은 KST 날짜면 같은 대국', () => {
    const a = classicOfTheDay(items, new Date('2026-09-30T15:00:00Z'))
    const b = classicOfTheDay(items, new Date('2026-10-01T14:59:00Z'))
    expect(a).toBe(b)
  })
  it('n일 연속이면 모든 대국을 한 번씩 보여준다', () => {
    const seen = new Set(
      range(items.length).map((d) => classicOfTheDay(items, new Date(Date.UTC(2026, 0, 1 + d, 3)))),
    )
    expect(seen.size).toBe(items.length)
  })
  it('빈 컬렉션은 에러', () => {
    expect(() => classicOfTheDay([], new Date())).toThrow()
  })
})
