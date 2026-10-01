import { Chess } from 'chess.js'
import { useId, useState, type FormEvent } from 'react'
import type { QuizScene } from '../../../quiz/types'
import * as q from '../../../styles/features/quiz.css'
import { Button } from '../../../ui/Button'
import { cx } from '../../../ui/cx'
import { TextField } from '../../../ui/Field'
import type { QuizState } from './useQuiz'

const ALTERNATIVE = '좋은 수예요. 실제로는 다른 수를 뒀어요.'

function messageOf(quiz: QuizState): string | null {
  if (quiz.status === 'thinking') return '확인하는 중…'
  switch (quiz.feedback?.kind) {
    case 'correct':
      return '정답이에요!'
    case 'alternative':
      return ALTERNATIVE
    case 'wrong':
      return quiz.feedback.refutation ?? '그 수는 잘 통하지 않아요. 다시 둬 보세요.'
    default:
      return null
  }
}

export function QuizCard({ scene, quiz, onContinue, onQuit }: { scene: QuizScene; quiz: QuizState; onContinue: () => void; onQuit: () => void }) {
  const [san, setSan] = useState('')
  const [sanError, setSanError] = useState<string | null>(null)
  const errorId = useId()
  const total = scene.steps.length
  const done = quiz.status === 'done'
  const wrong = quiz.feedback?.kind === 'wrong'

  const submitSan = (e: FormEvent) => {
    e.preventDefault()
    let uci: string
    try {
      const m = new Chess(quiz.fen).move(san.trim())
      uci = m.from + m.to + (m.promotion ?? '')
    } catch {
      setSanError('둘 수 없는 수예요')
      return
    }
    setSanError(null)
    setSan('')
    void quiz.play(uci)
  }

  // 끝났을 때: 마지막 수에 대한 말을 먼저 하고, 한 번에(힌트·오답 없이) 맞힌 수를 센다
  const message = done ? `${messageOf(quiz) ?? ''} ${total}수 중 ${quiz.solved}수를 한 번에 맞혔어요.`.trim() : messageOf(quiz)

  return (
    <section aria-label="퀴즈" className={q.card}>
      <p className={q.prompt}>{scene.prompt}</p>
      {total > 1 && (
        <p className={q.steps} role="img" aria-label={`${total}수 중 ${Math.min(quiz.stepIndex + 1, total)}번째`}>
          {scene.steps.map((_, i) => (
            <span key={i} className={cx(q.dot, i <= quiz.stepIndex && q.dotOn)} />
          ))}
        </p>
      )}
      <p
        aria-live="polite"
        // 다시 둘 때마다 thinking → feedback으로 바뀌므로, 같은 오답이어도 새로 그려 흔들린다
        key={wrong ? `wrong-${quiz.status}` : 'msg'}
        className={cx(q.message, wrong ? cx(q.feedbackBad, q.shakeOnce) : quiz.feedback && q.feedbackGood)}
      >
        {message}
      </p>
      {quiz.hintSquare && !done && <p className={q.hint}>{quiz.step.hint ?? `${quiz.hintSquare}의 기물을 움직여 보세요.`}</p>}
      {done ? (
        <div className={q.actions}>
          <Button onClick={onContinue}>이어서 보기</Button>
        </div>
      ) : (
        <>
          <div className={q.actions}>
            <Button tone="secondary" size="sm" className={q.onCard} onClick={quiz.hint} disabled={quiz.busy}>
              힌트
            </Button>
            <Button tone="secondary" size="sm" className={q.onCard} onClick={quiz.reveal} disabled={quiz.busy}>
              정답 보기
            </Button>
            <Button tone="ghost" size="sm" onClick={onQuit}>
              그만두기
            </Button>
          </div>
          <form className={q.sanForm} onSubmit={submitSan}>
            <TextField
              className={q.sanField}
              label="수 입력 (예: Nf3)"
              value={san}
              autoComplete="off"
              spellCheck={false}
              aria-invalid={sanError ? true : undefined}
              aria-describedby={sanError ? errorId : undefined}
              onChange={(e) => {
                setSan(e.target.value)
                setSanError(null)
              }}
            />
            <Button type="submit" size="sm" disabled={quiz.busy || san.trim() === ''}>
              두기
            </Button>
          </form>
          {sanError && (
            <p id={errorId} role="alert" className={cx(q.hint, q.feedbackBad)}>
              {sanError}
            </p>
          )}
        </>
      )}
    </section>
  )
}
