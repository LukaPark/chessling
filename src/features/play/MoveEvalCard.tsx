import { moveTitle } from '../../chess/moveNumber'
import type { Ply } from '../../chess/types'
import { glyphColor } from '../../components/judgment.css'
import { JUDGMENT_META } from '../../engine/judge'
import * as s from '../../styles/features/play.css'
import { visuallyHidden } from '../../ui/a11y.css'
import { cx } from '../../ui/cx'
import { CommentText } from '../viewer/CommentText'
import type { LatestEvaluation } from './useMoveEvaluation'

/** 내가 둔 마지막 수의 평가: "12. Nf3 · 실수 ? · 더 나은 수 Bd3"와 자동 코멘트 */
export function MoveEvalCard({ plies, latest }: { plies: Ply[]; latest: LatestEvaluation }) {
  const title = moveTitle(plies, latest.index)
  const sep = (
    <span className={s.evalSep} aria-hidden="true">
      ·
    </span>
  )
  const done = latest.status === 'done' ? latest : null
  const meta = done?.label ? JUDGMENT_META[done.label] : null
  const announce = done
    ? [title, meta ? meta.name : '강제 수', done.betterSan ? `더 나은 수 ${done.betterSan}` : null].filter(Boolean).join(', ')
    : ''
  return (
    <section aria-label="수 평가" className={s.evalCard}>
      <p className={s.evalLine}>
        <span className={s.evalMove}>{title}</span>
        {sep}
        {!done ? (
          <span className={s.evalMuted}>평가하는 중…</span>
        ) : meta && done.label ? (
          <span className={cx(s.evalLabel, glyphColor[done.label])}>
            <span>{meta.name}</span>
            {meta.glyph && <span aria-hidden="true">{meta.glyph}</span>}
          </span>
        ) : (
          <span className={s.evalMuted}>강제 수</span>
        )}
        {done?.betterSan && (
          <>
            {sep}
            <span>더 나은 수 {done.betterSan}</span>
          </>
        )}
      </p>
      {done?.comment && <CommentText key={latest.index} text={done.comment} />}
      <p className={visuallyHidden} aria-live="polite">
        {announce}
      </p>
    </section>
  )
}
