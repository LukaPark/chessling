import { Chess } from 'chess.js'
import { PIECE_VALUE } from '../chess/material'
import { PIECE_KO, withJosa } from '../engine/comment/korean'

/** 사용자 수를 둔 포지션에서 상대 최선 응수가 무엇을 따는지 한 줄로 */
export function refutationText(fenAfterUserMove: string, replyUci: string): string | null {
  const c = new Chess(fenAfterUserMove)
  try {
    const m = c.move({ from: replyUci.slice(0, 2), to: replyUci.slice(2, 4), promotion: replyUci[4] })
    if (c.isCheckmate()) return `${withJosa(m.san, '으로/로')} 바로 메이트당해요.`
    if (m.captured && PIECE_VALUE[m.captured] >= 3) return `${withJosa(m.san, '이/가')} 나오면 ${withJosa(PIECE_KO[m.captured], '을/를')} 잃어요.`
    if (m.captured) return `${withJosa(m.san, '으로/로')} 폰을 내줘요.`
    return `${withJosa(m.san, '으로/로')} 받아치면 이점이 사라져요.`
  } catch {
    return null
  }
}
