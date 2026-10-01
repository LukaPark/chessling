import { turnOf } from '../chess/pgn'
import type { Ply } from '../chess/types'
import { winPercent } from '../engine/classify'
import { withJosa } from '../engine/comment/korean'
import type { MoveLabel } from '../engine/judge'
import type { GameReview } from '../engine/review'
import type { QuizScene, QuizStep } from './types'

export const QUIZ_ONLY_MOVE_GAP = 10
export const QUIZ_MAX_STEPS = 4
export const QUIZ_MAX_SCENES = 5
export const QUIZ_ALT_TOLERANCE = 3

const BAD: MoveLabel[] = ['blunder', 'mistake', 'miss']
const GOOD: MoveLabel[] = ['great', 'brilliant']

/** 둘 쪽 기준 승률 */
const povWin = (w: number, side: 'w' | 'b') => (side === 'w' ? w : 100 - w)

/** i번째 포지션(둘 차례)에서 최선 수가 사실상 외길인가 */
function isOnlyMove(review: GameReview, i: number, side: 'w' | 'b'): boolean {
  const p = review.positions[i]
  if (!p?.second) return false
  return povWin(winPercent(p.score), side) - povWin(winPercent(p.second), side) >= QUIZ_ONLY_MOVE_GAP
}

/**
 * c-1 포지션에서 시작하는 장면을, 같은 편의 앞선 수가 최선이고 외길이었던 만큼 앞으로 당긴다.
 * 사용자 수(start-2 … c-1)가 QUIZ_MAX_STEPS를 넘지 않게 한다.
 */
function buildUpStart(plies: Ply[], review: GameReview, c: number, mover: 'w' | 'b'): number {
  let start = c - 1
  while (
    start - 2 >= 0 &&
    (c - 1 - (start - 2)) / 2 + 1 <= QUIZ_MAX_STEPS &&
    plies[start - 1]?.uci === review.positions[start - 2]?.best &&
    isOnlyMove(review, start - 2, mover)
  )
    start -= 2
  return start
}

export function selectScenes(plies: Ply[], review: GameReview, side: 'w' | 'b' | null): QuizScene[] {
  const candidates: { scene: QuizScene; swing: number }[] = []
  for (let c = 1; c < plies.length; c++) {
    const label = review.labels[c]
    if (!label || (!BAD.includes(label) && !GOOD.includes(label))) continue
    const mover = turnOf(plies[c - 1].fen)
    if (side && mover !== side) continue
    const good = GOOD.includes(label)
    // 실수류는 승부처 직전이 외길일 때만 빌드업을 붙인다
    const extend = !good && isOnlyMove(review, c - 1, mover)
    const start = good || extend ? buildUpStart(plies, review, c, mover) : c - 1
    const steps: QuizStep[] = []
    for (let i = start; i < c - 1; i += 2) steps.push({ answerUci: plies[i + 1].uci!, replyUci: plies[i + 2].uci! })
    if (good) {
      steps.push({ answerUci: plies[c].uci! })
    } else {
      const best = review.positions[c - 1].best
      if (!best) continue
      // 승부처부터는 엔진 1순위 수순 [사용자, 상대, 사용자, …]을 따른다. 외길일 때만 늘린다.
      // pv 안쪽 포지션은 엔진 데이터가 없어 외길 여부를 다시 따지지 않는다.
      const pv = review.positions[c - 1].pv
      const line = pv[0] === best ? pv : [best]
      for (let k = 0; k < line.length && steps.length < QUIZ_MAX_STEPS; k += 2) {
        steps.push({ answerUci: line[k], replyUci: extend ? line[k + 1] : undefined })
        if (!extend || !line[k + 1]) break
      }
    }
    // 마지막 단계에는 응수를 두지 않는다
    delete steps.at(-1)!.replyUci
    const swing = Math.abs(winPercent(review.positions[c].score) - winPercent(review.positions[c - 1].score))
    candidates.push({
      swing,
      scene: {
        id: `auto-${start}-${mover}`,
        startPly: start,
        side: mover,
        prompt: promptFor(mover, good, steps.length),
        steps,
        source: 'auto',
        focusPly: c,
      },
    })
  }
  const picked: QuizScene[] = []
  for (const { scene } of candidates.sort((a, b) => b.swing - a.swing)) {
    const end = scene.startPly + scene.steps.length * 2
    if (picked.some((p) => scene.startPly <= p.startPly + p.steps.length * 2 && p.startPly <= end)) continue
    picked.push(scene)
    if (picked.length === QUIZ_MAX_SCENES) break
  }
  return picked.sort((a, b) => a.startPly - b.startPly)
}

function promptFor(side: 'w' | 'b', good: boolean, n: number): string {
  const who = side === 'w' ? '백' : '흑'
  if (good) return n > 1 ? `${withJosa(who, '이/가')} 공격을 이어갈 차례예요. ${n}수를 찾아보세요.` : `여기서 ${withJosa(who, '은/는')} 무엇을 둘까요?`
  return n > 1 ? `${who}에게 더 좋은 수순이 있었어요. ${n}수를 찾아보세요.` : `${who}에게 더 좋은 수가 있었어요. 찾아보세요.`
}
