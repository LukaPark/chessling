import { Chess } from 'chess.js'
import { winPercent, type Score } from '../engine/classify'
import { refutationText } from './refute'
import { QUIZ_ALT_TOLERANCE } from './selectScenes'
import type { QuizStep } from './types'

export type Grade = { kind: 'correct' } | { kind: 'alternative' } | { kind: 'wrong'; refutation: string | null }

/** 엔진: fen(백 기준 점수)과 최선 응수를 돌려준다 */
export type Evaluate = (fen: string) => Promise<{ score: Score; best: string | null }>

export async function gradeMove({ fen, uci, step, side, evaluate }: { fen: string; uci: string; step: QuizStep; side: 'w' | 'b'; evaluate: Evaluate }): Promise<Grade> {
  if (uci === step.answerUci || step.acceptUci?.includes(uci)) return { kind: 'correct' }
  const authored = step.refutations?.find((r) => r.uci === uci)
  const afterUser = play(fen, uci)
  const afterAnswer = play(fen, step.answerUci)
  if (!afterUser || !afterAnswer) return { kind: 'wrong', refutation: null }
  // 다른 수로 메이트했으면 그보다 좋은 수는 없다. 끝난 포지션은 엔진에 묻지 않는다.
  if (!authored && new Chess(afterUser).isCheckmate()) return { kind: 'alternative' }
  const pov = (s: Score) => (side === 'w' ? winPercent(s) : 100 - winPercent(s))
  // 분석 엔진은 latest-wins라 동시에 보내면 앞의 평가가 취소된다. 차례로 기다린다.
  const mine = await evaluate(afterUser)
  const answer = await evaluate(afterAnswer)
  if (!authored && pov(answer.score) - pov(mine.score) <= QUIZ_ALT_TOLERANCE) return { kind: 'alternative' }
  return { kind: 'wrong', refutation: authored?.text ?? (mine.best ? refutationText(afterUser, mine.best) : null) }
}

function play(fen: string, uci: string): string | null {
  const c = new Chess(fen)
  try {
    c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] })
    return c.fen()
  } catch {
    return null
  }
}
