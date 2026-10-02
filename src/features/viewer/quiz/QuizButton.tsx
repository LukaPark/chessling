import { Check, Puzzle } from 'lucide-react'
import { Button } from '../../../ui/Button'
import * as q from '../../../styles/features/quiz.css'

/** 판정 카드 안의 퀴즈 시작 버튼. 보드를 가리지 않게 보드 밖에 둔다 */
export function QuizButton({ onStart, done }: { onStart: () => void; done: boolean }) {
  return (
    <Button tone={done ? 'secondary' : 'primary'} size="sm" icon={done ? Check : Puzzle} className={done ? q.onCard : undefined} onClick={onStart}>
      {done ? '퀴즈 다시 풀기' : '이 장면 퀴즈 풀기'}
    </Button>
  )
}
