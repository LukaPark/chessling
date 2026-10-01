import { moveNumberOf } from '../chess/moveNumber'
import type { Ply } from '../chess/types'
import { JUDGMENT_META, type MoveLabel } from '../engine/judge'
import { cx } from '../ui/cx'
import { glyphColor } from './judgment.css'
import * as s from './moveList.css'

export interface MoveListProps {
  plies: Ply[]
  current: number
  /** 없으면 누를 수 없는 목록으로 그린다 */
  onSelect?: (index: number) => void
  labels?: (MoveLabel | null)[]
}

export function MoveList({ plies, current, onSelect, labels }: MoveListProps) {
  return (
    <ol className={s.list}>
      {plies.slice(1).map((ply, idx) => {
        const i = idx + 1
        const { number: moveNo, white: whiteMove } = moveNumberOf(plies[0].fen, i)
        const prefix = whiteMove ? `${moveNo}.` : idx === 0 ? `${moveNo}...` : ''
        const label = labels?.[i] ?? null
        const glyph = label ? JUDGMENT_META[label].glyph : ''
        const content = (
          <>
            {ply.san}
            {label && glyph && <span className={cx(s.glyph, glyphColor[label])}>{glyph}</span>}
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
