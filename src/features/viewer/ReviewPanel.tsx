import { Play } from 'lucide-react'
import { ErrorView } from '../../components/ErrorView'
import * as g from '../../styles/features/gameLayout.css'
import { Button } from '../../ui/Button'
import type { ReviewState } from './useReview'

export function ReviewPanel({ state, onStart }: { state: ReviewState; onStart: () => void }) {
  switch (state.status) {
    case 'idle':
      return (
        <div className={g.reviewIdle}>
          <Button icon={Play} onClick={onStart}>
            리뷰 실행
          </Button>
          <p className={g.note}>리뷰를 실행하면 수마다 판정이 붙어요</p>
        </div>
      )
    case 'running':
      return (
        <p className={g.note}>
          <progress max={state.total} value={state.done} aria-label="리뷰 진행률" /> 분석 중 {state.done}/{state.total}
        </p>
      )
    case 'error':
      return <ErrorView key={state.attempt} error={state.error} onRetry={onStart} />
    case 'done':
      return null
  }
}
