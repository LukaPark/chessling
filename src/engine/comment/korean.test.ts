import { describe, expect, it } from 'vitest'
import { hasBatchim, PIECE_KO, squareKo, withJosa } from './korean'

describe('조사', () => {
  it('한글 받침', () => {
    expect(hasBatchim('폰')).toBe(true)
    expect(hasBatchim('나이트')).toBe(false)
    expect(withJosa('퀸', '을/를')).toBe('퀸을')
    expect(withJosa('나이트', '을/를')).toBe('나이트를')
    expect(withJosa('비숍', '이/가')).toBe('비숍이')
  })
  it('칸 이름은 숫자를 읽는 소리로 판단', () => {
    expect(withJosa('e5', '은/는')).toBe('e5는') // 오
    expect(withJosa('d4', '이/가')).toBe('d4가') // 사
    expect(withJosa('f7', '을/를')).toBe('f7을') // 칠
    expect(withJosa('h8', '은/는')).toBe('h8은') // 팔
  })
  it('으로/로: ㄹ 받침과 받침 없음은 로', () => {
    expect(withJosa('룩', '으로/로')).toBe('룩으로')
    expect(withJosa('e1', '으로/로')).toBe('e1로') // 일(ㄹ)
    expect(withJosa('e2', '으로/로')).toBe('e2로') // 이
    expect(withJosa('e3', '으로/로')).toBe('e3으로') // 삼
  })
  it('SAN 끝의 +, #, =Q는 무시하고 마지막 칸으로 판단', () => {
    expect(withJosa('Qxf7+', '은/는')).toBe('Qxf7+은')
    expect(withJosa('e8=Q', '을/를')).toBe('e8=Q을') // '이팔 퀸'으로 읽음
  })
  it('기물 이름', () => {
    expect(PIECE_KO.n).toBe('나이트')
    expect(PIECE_KO.k).toBe('킹')
  })
  it('squareKo', () => {
    expect(squareKo('e5')).toBe('e5')
  })
})
