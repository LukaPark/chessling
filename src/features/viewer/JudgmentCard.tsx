import { Lightbulb, Check, MoveUpRight } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { moveTitle } from '../../chess/moveNumber'
import { pvToSan } from '../../chess/pgn'
import type { Ply } from '../../chess/types'
import { glyphColor } from '../../components/judgment.css'
import { buildReview, REVIEW_DEPTH } from '../../engine/review'
import { formatScore } from '../../engine/classify'
import { JUDGMENT_META, type MoveLabel } from '../../engine/judge'
import * as v from '../../styles/features/viewer.css'
import { visuallyHidden } from '../../ui/a11y.css'
import { cx } from '../../ui/cx'
import { Badge } from '../../ui/Badge'
import { Button } from '../../ui/Button'
import { Icon } from '../../ui/Icon'
import { SPRING } from '../../ui/motion'
import { useDebounced } from '../../ui/useDebounced'
import { CommentText } from './CommentText'
import { QuizButton } from './quiz/QuizButton'
import { ReviewPanel } from './ReviewPanel'
import type { ReviewState } from './useReview'

export function JudgmentCard({
  plies,
  ply,
  review,
  onStartReview,
  hint,
  hintUci,
  comment,
  quiz,
  guide,
}: {
  plies: Ply[]
  ply: number
  review: ReviewState
  onStartReview: () => void
  hint: boolean
  hintUci: string | null
  comment?: { text: string; key?: boolean } | null
  /** 이 포지션에서 시작하는 퀴즈 장면이 있을 때 */
  quiz?: { done: boolean; onStart: () => void } | null
  /** 보드 가이드 토글. 시작 포지션에서는 없다 */
  guide?: { on: boolean; onToggle: () => void } | null
}) {
  const data = review.status === 'done' ? review.review : review.status === 'running' && review.partial.length > ply ? buildReview(plies.slice(0, review.partial.length), review.partial, REVIEW_DEPTH) : null
  const label = data && ply > 0 ? data.labels[ply] : null
  const before = data && ply > 0 ? data.positions[ply - 1]?.score : undefined
  const after = data ? data.positions[ply]?.score : undefined
  const title = ply === 0 ? '시작 포지션' : moveTitle(plies, ply)
  const hintSan = hint && hintUci ? (pvToSan(plies[ply].fen, [hintUci], 1)[0] ?? null) : null
  const announce = useDebounced(
    [`현재 ${title}`, label ? JUDGMENT_META[label].name : null, hintSan ? `다음 수 힌트 ${hintSan}` : null].filter(Boolean).join(', '),
    400,
  )

  const reviewAnnounce = useReviewAnnouncement(review.status)

  return (
    <section aria-label="이번 수 판정" className={v.card}>
      {comment?.key && <Badge>핵심 장면</Badge>}
      <p className={v.move}>{title}</p>
      {review.status !== 'done' && <ReviewPanel state={review} onStart={onStartReview} />}
      {data && ply > 0 && (label ? <JudgmentLine label={label} /> : <p className={v.detail}>강제 수</p>)}
      {data && before && after && (
        <p className={v.detail}>
          형세 {formatScore(before)} → {formatScore(after)}
        </p>
      )}
      {comment && <CommentText key={ply} text={comment.text} />}
      {(quiz || guide) && (
        <div className={v.quizRow}>
          {quiz && <QuizButton done={quiz.done} onStart={quiz.onStart} />}
          {guide && (
            <Button tone="secondary" size="sm" icon={MoveUpRight} aria-pressed={guide.on} onClick={guide.onToggle}>
              가이드
            </Button>
          )}
        </div>
      )}
      {hint && (
        <p className={v.hint}>
          <Icon icon={Lightbulb} size={16} />
          {hintSan ? `다음 수 힌트: ${hintSan}` : '힌트를 찾는 중…'}
        </p>
      )}
      <p className={visuallyHidden} aria-live="polite">
        {announce}
      </p>
      <p className={visuallyHidden} aria-live="polite">
        {reviewAnnounce}
      </p>
    </section>
  )
}

function JudgmentLine({ label }: { label: MoveLabel }) {
  const meta = JUDGMENT_META[label]
  return (
    <motion.p
      key={label}
      className={cx(v.judgment, glyphColor[label])}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={label === 'blunder' ? { opacity: 1, scale: 1, x: [0, -4, 4, -2, 0] } : { opacity: 1, scale: 1 }}
      transition={{ default: SPRING, x: { duration: 0.32, ease: 'easeOut' } }}
    >
      <span className={v.glyph} aria-hidden="true">{meta.glyph || <Icon icon={Check} size={20} />}</span>
      <span>{meta.name}</span>
    </motion.p>
  )
}

/** 리뷰 시작과 끝을 한 번씩만 알린다(수마다 진행률을 읽지 않는다). 캐시에서 불러온 리뷰는 알리지 않는다. */
function useReviewAnnouncement(status: ReviewState['status']): string {
  const [text, setText] = useState('')
  const prev = useRef(status)
  useEffect(() => {
    if (status === 'running' && prev.current !== 'running') setText('리뷰를 시작했어요')
    else if (status === 'done' && prev.current === 'running') setText('리뷰가 끝났어요')
    else if (status === 'idle') setText('')
    prev.current = status
  }, [status])
  return text
}
