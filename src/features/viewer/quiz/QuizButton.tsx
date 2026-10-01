import { Check, Puzzle } from 'lucide-react'
import * as q from '../../../styles/features/quiz.css'
import { cx } from '../../../ui/cx'
import { Icon } from '../../../ui/Icon'

export function QuizButton({ onStart, done }: { onStart: () => void; done: boolean }) {
  const label = done ? '퀴즈: 다시 풀기 (푼 장면)' : '퀴즈: 이 장면 직접 두기'
  return (
    <button type="button" className={cx(q.overlay, done && q.overlayDone)} aria-label={label} title={label} onClick={onStart}>
      <Icon icon={done ? Check : Puzzle} size={22} />
    </button>
  )
}
