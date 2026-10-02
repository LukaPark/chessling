import { Chess, DEFAULT_POSITION } from 'chess.js'

/** 수 번호와 50수 규칙 카운터를 뺀 포지션 키 */
export function epdOf(fen: string): string {
  return fen.split(' ').slice(0, 4).join(' ')
}

export const START_EPD = epdOf(DEFAULT_POSITION)

const MOVE_NUMBER = /\d+\.(\.\.)?/g

/** "1. e4 c5 2. Nf3"를 UCI로 바꾼다. 둘 수 없는 수가 있으면 Error */
export function sanLineToUci(line: string, startFen: string = DEFAULT_POSITION): { uci: string[]; fens: string[] } {
  const chess = new Chess(startFen)
  const uci: string[] = []
  const fens: string[] = []
  for (const san of line.replace(MOVE_NUMBER, ' ').split(/\s+/).filter(Boolean)) {
    let m
    try {
      m = chess.move(san)
    } catch {
      throw new Error(`둘 수 없는 수: ${san} (${line})`)
    }
    uci.push(m.from + m.to + (m.promotion ?? ''))
    fens.push(chess.fen())
  }
  return { uci, fens }
}
