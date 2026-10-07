import type { Key } from '@lichess-org/chessground/types'
import { useReducedMotion } from 'motion/react'
import { useMemo, type ReactNode } from 'react'
import { legalDests, toUci } from '../../../chess/fork'
import { isCheck } from '../../../chess/pgn'
import type { Color, Ply } from '../../../chess/types'
import { Board } from '../../../components/Board'
import { EvalBar } from '../../../components/EvalBar'
import type { Evaluate } from '../../../quiz/grade'
import type { QuizScene } from '../../../quiz/types'
import * as g from '../../../styles/features/gameLayout.css'
import { QuizCard } from './QuizCard'
import { useQuiz, type QuizFinish } from './useQuiz'

/** 퀴즈 중의 보드와 패널. 장면마다 새 상태가 필요하므로 부모가 key={scene.id}로 마운트한다 */
export function ActiveQuiz({
  scene,
  plies,
  orientation,
  evaluate,
  controls,
  onFinish,
  onContinue,
  onQuit,
}: {
  scene: QuizScene
  plies: Ply[]
  orientation: Color
  evaluate: Evaluate
  /** 보드 바로 아래에 둘 조작 막대 */
  controls?: ReactNode
  onFinish: (r: QuizFinish) => void
  onContinue: () => void
  onQuit: () => void
}) {
  const reducedMotion = useReducedMotion() ?? false
  const quiz = useQuiz({ scene, plies, evaluate, reducedMotion, onFinish })
  const dests = useMemo(() => legalDests(quiz.fen) as Map<Key, Key[]>, [quiz.fen])
  const movable = quiz.busy
    ? null
    : { color: (scene.side === 'w' ? 'white' : 'black') as Color, dests, onMove: (from: Key, to: Key) => void quiz.play(toUci(quiz.fen, from, to)) }
  const shapes = useMemo(() => (quiz.hintSquare ? [{ orig: quiz.hintSquare as Key, brush: 'green' }] : []), [quiz.hintSquare])

  return (
    <>
      <div className={g.boardCol}>
        <div className={g.stage}>
          {/* 퀴즈 중에는 평가를 숨긴다. 자리만 남겨 보드가 움직이지 않게 한다 */}
          <EvalBar score={null} orientation={orientation} hidden />
          <div className={g.boardWrap}>
            <Board fen={quiz.fen} orientation={orientation} lastMoveUci={quiz.lastUci} check={isCheck(quiz.fen)} shapes={shapes} movable={movable} />
          </div>
        </div>
        {controls}
      </div>
      <div className={g.panel}>
        <QuizCard scene={scene} quiz={quiz} onContinue={onContinue} onQuit={onQuit} />
      </div>
    </>
  )
}
