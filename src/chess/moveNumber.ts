import { turnOf } from './pgn'
import type { Ply } from './types'

/** plyIndex: 1 = 첫 수 */
export function moveNumberOf(startFen: string, plyIndex: number): { number: number; white: boolean } {
  const blackFirst = turnOf(startFen) === 'b'
  const first = Number(startFen.split(' ')[5]) || 1
  const idx = plyIndex - 1
  return { number: first + Math.floor((idx + (blackFirst ? 1 : 0)) / 2), white: (idx % 2 === 0) !== blackFirst }
}

export function moveTitle(plies: Ply[], i: number): string {
  const { number, white } = moveNumberOf(plies[0].fen, i)
  return `${number}${white ? '.' : '...'} ${plies[i].san}`
}
