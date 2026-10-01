import { describe, expect, it } from 'vitest'
import {
  applyMove,
  createFork,
  ELO_MAX,
  ELO_MIN,
  forkPlies,
  forkStatus,
  forkToPgn,
  IllegalMoveError,
  legalDests,
  movetimeFor,
  resign,
  takeback,
  toUci,
  type ForkRecord,
} from './fork'

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const MATE_IN_1 = '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1'

function fork(over: Partial<ForkRecord> = {}): ForkRecord {
  return {
    ...createFork(
      { origin: { kind: 'classic', slug: 'opera-game' }, originPly: 0, startFen: START, playerColor: 'white', engineElo: 1500, title: 't' },
      1000,
      'id-1',
    ),
    ...over,
  }
}

describe('createFork', () => {
  it('초기 상태', () => {
    expect(fork()).toEqual({
      id: 'id-1',
      title: 't',
      origin: { kind: 'classic', slug: 'opera-game' },
      originPly: 0,
      startFen: START,
      moves: [],
      playerColor: 'white',
      engineElo: 1500,
      result: '*',
      createdAt: 1000,
      updatedAt: 1000,
    })
  })
})

describe('applyMove / forkStatus', () => {
  it('수를 더하고 차례가 바뀐다', () => {
    const f = applyMove(fork(), 'e2e4', 2000)
    expect(f.moves).toEqual(['e2e4'])
    expect(f.updatedAt).toBe(2000)
    expect(forkStatus(f)).toMatchObject({ over: false, turn: 'black', lastMove: 'e2e4', check: false })
  })
  it('불법 수는 IllegalMoveError', () => {
    expect(() => applyMove(fork(), 'e2e5')).toThrow(IllegalMoveError)
  })
  it('체크메이트면 결과를 기록한다', () => {
    const f = applyMove(fork({ startFen: MATE_IN_1 }), 'a1a8')
    expect(f).toMatchObject({ result: '1-0', endReason: 'checkmate' })
    expect(forkStatus(f)).toMatchObject({ over: true, result: '1-0', reason: 'checkmate', check: true })
  })
  it('3회 반복', () => {
    let f = fork()
    for (const m of ['g1f3', 'g8f6', 'f3g1', 'f6g8', 'g1f3', 'g8f6', 'f3g1', 'f6g8']) f = applyMove(f, m)
    expect(f).toMatchObject({ result: '1/2-1/2', endReason: 'threefold' })
  })
})

describe('takeback', () => {
  it('내 차례면 엔진 수와 내 수를 되돌린다', () => {
    const f = takeback(fork({ moves: ['e2e4', 'e7e5'] }))
    expect(f.moves).toEqual([])
  })
  it('엔진 차례(내가 방금 둠)면 내 수 하나만', () => {
    expect(takeback(fork({ moves: ['e2e4', 'e7e5', 'g1f3'] })).moves).toEqual(['e2e4', 'e7e5'])
  })
  it('내가 흑이고 엔진이 먼저 둔 경우', () => {
    const f = fork({ playerColor: 'black', moves: ['e2e4', 'e7e5', 'g1f3'] })
    expect(takeback(f).moves).toEqual(['e2e4'])
  })
  it('내 수가 없으면 그대로', () => {
    const f = fork({ playerColor: 'black', moves: ['e2e4'] })
    expect(takeback(f)).toBe(f)
  })
  it('종료 상태를 해제한다', () => {
    const f = takeback(applyMove(fork({ startFen: MATE_IN_1 }), 'a1a8'))
    expect(f).toMatchObject({ moves: [], result: '*', endReason: undefined })
  })
})

describe('resign', () => {
  it('내가 백이면 0-1', () => {
    expect(resign(fork())).toMatchObject({ result: '0-1', endReason: 'resign' })
    expect(forkStatus(resign(fork()))).toMatchObject({ over: true, reason: 'resign' })
  })
})

describe('보조 함수', () => {
  it('toUci는 폰 승진을 퀸으로', () => {
    expect(toUci('4k3/P7/8/8/8/8/8/4K3 w - - 0 1', 'a7', 'a8')).toBe('a7a8q')
    expect(toUci(START, 'e2', 'e4')).toBe('e2e4')
  })
  it('legalDests', () => {
    const dests = legalDests(START)
    expect(dests.get('e2')?.sort()).toEqual(['e3', 'e4'])
    expect(dests.get('g1')?.sort()).toEqual(['f3', 'h3'])
  })
  it('movetimeFor 범위', () => {
    expect(movetimeFor(ELO_MIN)).toBe(300)
    expect(movetimeFor(ELO_MAX)).toBe(1500)
  })
  it('forkPlies', () => {
    const plies = forkPlies(fork({ moves: ['e2e4', 'e7e5'] }))
    expect(plies.map((p) => p.san)).toEqual([null, 'e4', 'e5'])
  })
  it('forkToPgn은 시작 FEN과 결과를 담는다', () => {
    const pgn = forkToPgn(applyMove(fork({ startFen: MATE_IN_1 }), 'a1a8'))
    expect(pgn).toContain(`[FEN "${MATE_IN_1}"]`)
    expect(pgn).toContain('[Result "1-0"]')
    expect(pgn).toContain('[White "You"]')
    expect(pgn).toContain('[Black "Stockfish (Elo 1500)"]')
    expect(pgn).toContain('1. Ra8#')
  })
})
