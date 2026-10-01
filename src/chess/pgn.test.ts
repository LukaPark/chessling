import { describe, expect, it } from 'vitest'
import { isCheck, normalizeResult, parseHeaders, pgnToPlies, PgnError, pvToSan, stripAnnotations, turnOf, uciToMove } from './pgn'

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const OPERA =
  '[Event "Paris"]\n[White "Paul Morphy"]\n[Black "Duke Karl / Count Isouard"]\n[Result "1-0"]\n\n' +
  '1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 ' +
  '10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0'

describe('pgnToPlies', () => {
  it('시작 포지션 + 수마다 한 포지션', () => {
    const plies = pgnToPlies(OPERA)
    expect(plies).toHaveLength(34)
    expect(plies[0]).toEqual({ san: null, uci: null, fen: START })
    expect(plies[1]).toMatchObject({ san: 'e4', uci: 'e2e4' })
    expect(plies[33]).toMatchObject({ san: 'Rd8#', uci: 'd1d8' })
  })

  it('SetUp/FEN과 프로모션', () => {
    const plies = pgnToPlies('[SetUp "1"]\n[FEN "4k3/P7/8/8/8/8/8/4K3 w - - 0 1"]\n\n1. a8=Q+ *')
    expect(plies[0].fen).toBe('4k3/P7/8/8/8/8/8/4K3 w - - 0 1')
    expect(plies[1]).toMatchObject({ san: 'a8=Q+', uci: 'a7a8q' })
  })

  it('캐슬링은 킹 이동 UCI', () => {
    const plies = pgnToPlies('1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. O-O *')
    expect(plies.at(-1)?.uci).toBe('e1g1')
  })

  it('결과만 있는 PGN', () => {
    expect(pgnToPlies('[Result "1-0"]\n\n1-0')).toHaveLength(1)
  })

  it('평가·시계 주석이 있어도 읽는다', () => {
    expect(pgnToPlies('1. e4 { [%eval 0.18] [%clk 1:30:47] } 1... c5 { [%eval 0.32] } *')).toHaveLength(3)
  })

  it('불법 수는 PgnError', () => {
    expect(() => pgnToPlies('1. e4 e5 2. Ke3 *')).toThrow(PgnError)
  })
})

describe('parseHeaders / normalizeResult', () => {
  it('헤더를 읽고 이스케이프를 푼다', () => {
    expect(parseHeaders('[Event "A \\"B\\""]\n[Result "0-1"]\n\n1. e4 *')).toEqual({ Event: 'A "B"', Result: '0-1' })
  })
  it('알 수 없는 결과는 *', () => {
    expect(normalizeResult('1-0')).toBe('1-0')
    expect(normalizeResult('1/2-1/2')).toBe('1/2-1/2')
    expect(normalizeResult('?')).toBe('*')
    expect(normalizeResult(undefined)).toBe('*')
  })
})

describe('FEN/UCI 보조 함수', () => {
  it('turnOf', () => {
    expect(turnOf(START)).toBe('w')
    expect(turnOf('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1')).toBe('b')
  })
  it('isCheck', () => {
    expect(isCheck(START)).toBe(false)
    expect(isCheck('4k3/8/8/8/8/8/8/R3K3 b - - 0 1')).toBe(false)
    expect(isCheck('R3k3/8/8/8/8/8/8/4K3 b - - 0 1')).toBe(true)
  })
  it('uciToMove', () => {
    expect(uciToMove('e2e4')).toEqual({ from: 'e2', to: 'e4', promotion: undefined })
    expect(uciToMove('a7a8q')).toEqual({ from: 'a7', to: 'a8', promotion: 'q' })
  })
  it('pvToSan은 불법 수에서 멈춘다', () => {
    expect(pvToSan(START, ['e2e4', 'e7e5', 'g1f3'])).toEqual(['e4', 'e5', 'Nf3'])
    expect(pvToSan(START, ['e2e4', 'e2e4', 'g1f3'])).toEqual(['e4'])
    expect(pvToSan(START, ['e2e4', 'e7e5', 'g1f3'], 2)).toEqual(['e4', 'e5'])
  })
})

describe('stripAnnotations', () => {
  it('주석·변화수·NAG·기호를 지우고 필요한 태그만 남긴다', () => {
    const raw =
      '[Event "E"]\n[Annotator "Someone"]\n[White "A"]\n[Result "1-0"]\n\n' +
      '1. e4 {좋은 수} e5 (1... c5 2. Nf3 (2. c3)) 2. Nf3!? $1 Nc6 ; 줄 주석\n3. Bb5?? 1-0'
    const out = stripAnnotations(raw)
    expect(out).toBe('[Event "E"]\n[White "A"]\n[Result "1-0"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bb5 1-0\n')
    expect(pgnToPlies(out)).toHaveLength(6)
  })

  it('; 주석 안의 { 가 뒤따르는 실제 수를 삼키지 않는다', () => {
    const out = stripAnnotations('1. e4 ; see {note\ne5 2. Nf3 {x} Nc6 *')
    expect(out).toBe('\n\n1. e4 e5 2. Nf3 Nc6 *\n')
  })
})
