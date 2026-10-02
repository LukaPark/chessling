import type { PieceSymbol } from 'chess.js'

export const PIECE_KO: Record<PieceSymbol, string> = { p: '폰', n: '나이트', b: '비숍', r: '룩', q: '퀸', k: '킹' }

/** 0~9를 읽는 소리: 영 일 이 삼 사 오 육 칠 팔 구 */
const DIGIT_BATCHIM: Record<string, 'none' | 'rieul' | 'other'> = {
  '0': 'other', '1': 'rieul', '2': 'none', '3': 'other', '4': 'none',
  '5': 'none', '6': 'other', '7': 'rieul', '8': 'rieul', '9': 'none',
}
const PROMO: Record<string, string> = { Q: '퀸', R: '룩', B: '비숍', N: '나이트' }

function finalSound(word: string): 'none' | 'rieul' | 'other' {
  let w = word.replace(/[+#!?]+$/g, '')
  const promo = w.match(/=([QRBN])$/)
  if (promo) w = PROMO[promo[1]]
  const last = w.at(-1) ?? ''
  if (last in DIGIT_BATCHIM) return DIGIT_BATCHIM[last]
  const code = last.charCodeAt(0) - 0xac00
  if (code < 0 || code > 11171) return 'none'
  const jong = code % 28
  if (jong === 0) return 'none'
  return jong === 8 ? 'rieul' : 'other'
}

export function hasBatchim(word: string): boolean {
  return finalSound(word) !== 'none'
}

export function withJosa(word: string, pair: '은/는' | '이/가' | '을/를' | '으로/로' | '과/와'): string {
  const [withB, withoutB] = pair.split('/')
  const s = finalSound(word)
  if (pair === '으로/로') return word + (s === 'other' ? withB : withoutB)
  return word + (s === 'none' ? withoutB : withB)
}

/** 칸 이름은 그대로 쓴다. 조사는 withJosa로 붙인다 */
export function squareKo(sq: string): string {
  return sq
}
