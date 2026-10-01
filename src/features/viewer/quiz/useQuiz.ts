import { Chess } from 'chess.js'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Ply } from '../../../chess/types'
import { gradeMove, type Evaluate, type Grade } from '../../../quiz/grade'
import type { QuizScene } from '../../../quiz/types'

/**
 * waiting: 사용자 수를 기다린다 / thinking: 채점 중 / feedback: 오답을 보여 주고 다시 기다린다
 * replying: 정답을 둔 뒤 상대 응수를 기다린다 / done: 끝
 */
export type QuizStatus = 'waiting' | 'thinking' | 'feedback' | 'replying' | 'done'

export interface QuizFinish {
  solvedSteps: number
  totalSteps: number
  attempts: number
}

/** evaluate가 다른 탐색에 밀려 취소됐을 때 던진다. 채점하지 않고 다시 기다린다 */
export class EvaluationCancelled extends Error {}

const REPLY_DELAY_MS = 600

function playUci(fen: string, uci: string): string {
  const c = new Chess(fen)
  c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] })
  return c.fen()
}

export function useQuiz({
  scene,
  plies,
  evaluate,
  reducedMotion,
  onFinish,
}: {
  scene: QuizScene
  plies: Ply[]
  evaluate: Evaluate
  reducedMotion: boolean
  onFinish: (r: QuizFinish) => void
}) {
  const [fen, setFen] = useState(plies[scene.startPly].fen)
  const [lastUci, setLastUci] = useState<string | null>(plies[scene.startPly].uci)
  const [stepIndex, setStepIndex] = useState(0)
  const [status, setStatus] = useState<QuizStatus>('waiting')
  const [feedback, setFeedback] = useState<Grade | null>(null)
  const [hintSquare, setHintSquare] = useState<string | null>(null)
  const solved = useRef(0)
  const attempts = useRef(0)
  const missedThisStep = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const step = scene.steps[stepIndex]

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  const finish = useCallback(() => {
    setStatus('done')
    onFinish({ solvedSteps: solved.current, totalSteps: scene.steps.length, attempts: attempts.current })
  }, [onFinish, scene])

  /** 사용자(또는 정답 보기)가 둔 수를 반영하고, 응수가 있으면 잠시 뒤 두고 다음 단계로 간다 */
  const advance = useCallback(
    (playedFen: string, uci: string) => {
      setFen(playedFen)
      setLastUci(uci)
      const reply = step.replyUci
      const next = stepIndex + 1
      if (!reply || next >= scene.steps.length) {
        finish()
        return
      }
      setStatus('replying')
      const doReply = () => {
        timer.current = null
        setFen(playUci(playedFen, reply))
        setLastUci(reply)
        setStepIndex(next)
        setStatus('waiting')
        setFeedback(null)
        setHintSquare(null)
        missedThisStep.current = false
      }
      if (reducedMotion) doReply()
      else timer.current = setTimeout(doReply, REPLY_DELAY_MS)
    },
    [step, stepIndex, scene, finish, reducedMotion],
  )

  const busy = status === 'thinking' || status === 'replying' || status === 'done'

  const play = useCallback(
    async (uci: string) => {
      if (busy) return
      attempts.current++
      setStatus('thinking')
      let grade: Grade
      try {
        grade = await gradeMove({ fen, uci, step, side: scene.side, evaluate })
      } catch (e) {
        // 취소·엔진 오류는 사용자 탓이 아니다. 시도로 세지 않고 다시 기다린다.
        attempts.current--
        setStatus(feedback?.kind === 'wrong' ? 'feedback' : 'waiting')
        if (!(e instanceof EvaluationCancelled)) console.warn('[quiz] 채점 실패', e)
        return
      }
      setFeedback(grade)
      if (grade.kind === 'wrong') {
        missedThisStep.current = true
        setStatus('feedback')
        return
      }
      if (!missedThisStep.current) solved.current++
      const played = playUci(fen, uci)
      if (grade.kind === 'alternative') {
        // 실제 기보와 갈라졌으니 장면을 여기서 끝낸다
        setFen(played)
        setLastUci(uci)
        finish()
        return
      }
      advance(played, uci)
    },
    [busy, fen, step, scene, evaluate, feedback, finish, advance],
  )

  const hint = useCallback(() => {
    if (busy) return
    missedThisStep.current = true
    setHintSquare(step.answerUci.slice(0, 2))
  }, [busy, step])

  const reveal = useCallback(() => {
    if (busy) return
    missedThisStep.current = true
    setFeedback(null)
    setHintSquare(null)
    advance(playUci(fen, step.answerUci), step.answerUci)
  }, [busy, fen, step, advance])

  return { fen, lastUci, stepIndex, status, feedback, hintSquare, step, solved: solved.current, busy, play, hint, reveal }
}

export type QuizState = ReturnType<typeof useQuiz>
