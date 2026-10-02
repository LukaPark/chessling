import { moveNumberOf } from '../chess/moveNumber'
import type { Ply } from '../chess/types'
import { JUDGMENT_META, type MoveLabel } from '../engine/judge'
import { visuallyHidden } from '../ui/a11y.css'
import { cx } from '../ui/cx'
import { glyphColor } from './judgment.css'
import * as s from './moveList.css'

export interface MoveListProps {
  plies: Ply[]
  current: number
  /** 없으면 누를 수 없는 목록으로 그린다 */
  onSelect?: (index: number) => void
  labels?: (MoveLabel | null)[]
  /** 퀴즈 장면이 시작되는 수(장면 시작 포지션 다음 수) */
  quizPlies?: Set<number>
}

export function MoveList({ plies, current, onSelect, labels, quizPlies }: MoveListProps) {
  return (
    <ol className={s.list}>
      {plies.slice(1).map((ply, idx) => {
        const i = idx + 1
        const { number: moveNo, white: whiteMove } = moveNumberOf(plies[0].fen, i)
        const prefix = whiteMove ? `${moveNo}.` : idx === 0 ? `${moveNo}...` : ''
        const label = labels?.[i] ?? null
        const glyph = label ? JUDGMENT_META[label].glyph : ''
        const quiz = quizPlies?.has(i) ?? false
        const content = (
          <>
            {ply.san}
            {label && glyph && <span className={cx(s.glyph, glyphColor[label])}>{glyph}</span>}
            {/* 공백을 span 밖에 둬야 읽을 이름이 "Nf3 (퀴즈 있음)"으로 띄어진다 */}
            {quiz && <> <span className={visuallyHidden}>(퀴즈 있음)</span></>}
          </>
        )
        return (
          <li key={i} className={s.item}>
            {prefix && <span className={s.number}>{prefix}</span>}
            {onSelect ? (
              <button
                type="button"
                className={s.move}
                data-label={label ?? undefined}
                data-quiz={quiz ? '' : undefined}
                title={label ? JUDGMENT_META[label].name : undefined}
                aria-current={i === current ? 'step' : undefined}
                onClick={() => onSelect(i)}
              >
                {content}
              </button>
            ) : (
              <span
                className={cx(s.move, s.readonly)}
                data-label={label ?? undefined}
                data-quiz={quiz ? '' : undefined}
                title={label ? JUDGMENT_META[label].name : undefined}
                aria-current={i === current ? 'step' : undefined}
              >
                {content}
              </span>
            )}
          </li>
        )
      })}
    </ol>
  )
}
