import type { GameRef } from './gameRef'

export type Color = 'white' | 'black'
export type Turn = 'w' | 'b'
export type Result = '1-0' | '0-1' | '1/2-1/2' | '*'
export type Speed =
  | 'ultraBullet'
  | 'bullet'
  | 'blitz'
  | 'rapid'
  | 'classical'
  | 'daily'
  | 'correspondence'
  | 'unknown'

export interface Player {
  name: string
  rating?: number
  title?: string
}

export interface GameSummary {
  ref: GameRef
  white: Player
  black: Player
  result: Result
  /** YYYY-MM-DD (명국은 연도만 알 수 있으면 YYYY) */
  date: string
  speed: Speed
  timeControl?: string
  variant: 'standard' | 'other'
  event?: string
}

export interface GameRecord extends GameSummary {
  pgn: string
}

/** 인덱스 0은 시작 포지션(san/uci = null), i번째는 i번째 수를 둔 뒤의 포지션 */
export interface Ply {
  san: string | null
  uci: string | null
  fen: string
}
