import { describe, expect, it } from 'vitest'
import { parseHeaders, pgnToPlies } from '../chess/pgn'
import { classics, classicToRecord, getClassic, todaysClassic } from './classics'

const MIN_CLASSICS = 30

describe('classics.json 데이터 검증', () => {
  it(`최소 ${MIN_CLASSICS}판`, () => {
    expect(classics.length).toBeGreaterThanOrEqual(MIN_CLASSICS)
  })
  it('slug는 유일한 kebab-case', () => {
    const slugs = classics.map((c) => c.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  })
  it.each(classics.map((c) => [c.slug, c] as const))('%s: 필수 필드·합법 수순·주석 없음', (_, c) => {
    expect(c.title.trim()).not.toBe('')
    expect(c.white.trim()).not.toBe('')
    expect(c.black.trim()).not.toBe('')
    expect(c.year).toBeGreaterThanOrEqual(1600)
    expect(c.year).toBeLessThanOrEqual(2100)
    expect(c.summaryKo.length).toBeGreaterThanOrEqual(40)
    expect(['1-0', '0-1', '1/2-1/2']).toContain(parseHeaders(c.pgn).Result)
    const movetext = c.pgn.replace(/^\[.*\]$/gm, '')
    expect(movetext).not.toMatch(/[{};()$]/)
    expect(pgnToPlies(c.pgn).length).toBeGreaterThan(1)
  })
})

describe('classics API', () => {
  it('연도순 정렬', () => {
    const years = classics.map((c) => c.year)
    expect(years).toEqual([...years].sort((a, b) => a - b))
  })
  it('getClassic / classicToRecord', () => {
    const c = getClassic('opera-game')!
    expect(classicToRecord(c)).toMatchObject({
      ref: { kind: 'classic', slug: 'opera-game' },
      white: { name: 'Paul Morphy' },
      result: '1-0',
      date: '1858',
      variant: 'standard',
      speed: 'classical',
    })
    expect(getClassic('nope')).toBeUndefined()
  })
  it('todaysClassic은 컬렉션 안의 대국', () => {
    expect(classics).toContain(todaysClassic(new Date('2026-09-30T00:00:00Z')))
  })
})
