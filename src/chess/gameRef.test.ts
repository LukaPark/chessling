import { describe, expect, it } from 'vitest'
import { pathToRef, refKey, refToPath, type GameRef } from './gameRef'

const cases: GameRef[] = [
  { kind: 'lichess', id: 'abcd1234' },
  { kind: 'chesscom', user: 'hikaru', yyyy: '2026', mm: '09', uuid: 'f78fcfe7-ab95-11f1-8ffd-6cfe54652c60' },
  { kind: 'broadcast', roundId: 'zwtIOEd2', gameId: '3YNrJV1C' },
  { kind: 'classic', slug: 'opera-game' },
]

describe('GameRef', () => {
  it.each(cases)('왕복 변환 %o', (ref) => {
    expect(pathToRef(refToPath(ref))).toEqual(ref)
  })

  it('정해진 경로 형식을 만든다', () => {
    expect(cases.map(refToPath)).toEqual([
      '/game/lichess/abcd1234',
      '/game/chesscom/hikaru/2026/09/f78fcfe7-ab95-11f1-8ffd-6cfe54652c60',
      '/game/broadcast/zwtIOEd2/3YNrJV1C',
      '/game/classic/opera-game',
    ])
  })

  it('잘못된 경로는 null', () => {
    for (const p of [
      '/',
      '/game',
      '/game/lichess',
      '/game/lichess/a/b',
      '/game/chesscom/hikaru/2026/09',
      '/game/chesscom/hikaru/26/09/uuid',
      '/game/unknown/x',
      '/player/lichess/x',
    ]) {
      expect(pathToRef(p)).toBeNull()
    }
  })

  it('잘못된 퍼센트 인코딩은 null', () => {
    for (const p of ['/game/lichess/%', '/game/lichess/100%', '/game/lichess/%E0%A4%A']) {
      expect(pathToRef(p)).toBeNull()
    }
  })

  it('끝 슬래시를 허용한다', () => {
    expect(pathToRef('/game/classic/opera-game/')).toEqual({ kind: 'classic', slug: 'opera-game' })
  })

  it('chesscom 유저명의 특수문자를 인코딩한다', () => {
    const ref: GameRef = { kind: 'chesscom', user: 'a b', yyyy: '2026', mm: '01', uuid: 'u' }
    expect(refToPath(ref)).toBe('/game/chesscom/a%20b/2026/01/u')
    expect(pathToRef(refToPath(ref))).toEqual(ref)
  })

  it('refKey는 /game/ 접두사가 없는 안정된 키', () => {
    expect(refKey(cases[0])).toBe('lichess/abcd1234')
    expect(refKey(cases[3])).toBe('classic/opera-game')
  })
})
