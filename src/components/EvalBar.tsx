import { assignInlineVars } from '@vanilla-extract/dynamic'
import type { Color } from '../chess/types'
import { formatScore, winPercent, type Score } from '../engine/classify'
import * as s from './evalBar.css'

export function EvalBar({ score, orientation }: { score: Score | null; orientation: Color }) {
  const white = score ? winPercent(score) : 50
  const text = score ? formatScore(score) : '…'
  return (
    <div
      className={s.root}
      data-orientation={orientation}
      role="meter"
      aria-label="평가"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(white)}
      aria-valuetext={score ? `백 기준 ${text}` : '분석 중'}
      style={assignInlineVars({ [s.whiteRatio]: String(white / 100) })}
    >
      <div className={s.track}>
        <div className={s.fill} />
      </div>
      <span className={s.label}>{text}</span>
    </div>
  )
}
