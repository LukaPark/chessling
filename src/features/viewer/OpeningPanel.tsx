import { DEFAULT_POSITION } from 'chess.js'
import { moveNumberOf } from '../../chess/moveNumber'
import type { Ply } from '../../chess/types'
import type { OpeningAt, OpeningTrack } from '../../openings/types'
import { compareLine, openingLabel, practiceLine } from '../../openings/view'
import * as v from '../../styles/features/viewer.css'
import { Button } from '../../ui/Button'
import { cx } from '../../ui/cx'

export interface OpeningPanelProps {
  track: OpeningTrack
  plies: Ply[]
  ply: number
  onPractice: (at: OpeningAt) => void
  onBranchAtDeviation: () => void
}

/** 지금 수의 오프닝(0수면 처음 판별된 오프닝)과 대표 수순, 분기 버튼 */
export function OpeningPanel({ track, plies, ply, onPractice, onBranchAtDeviation }: OpeningPanelProps) {
  const at = track.byPly[ply] ?? track.byPly.find((x) => x !== null) ?? null
  if (!at) return <p className={v.detail}>아직 알려진 오프닝 수순에 들어서지 않았어요.</p>
  const line = practiceLine(at)
  const same = compareLine(line.uci, plies)
  return (
    <div className={v.openingPanel}>
      <p className={v.move}>{openingLabel(at)}</p>
      {at.family && (
        <>
          <p>{at.family.idea}</p>
          <p className={v.detail}>백: {at.family.plans.white}</p>
          <p className={v.detail}>흑: {at.family.plans.black}</p>
        </>
      )}
      {at.variation && <p>{at.variation.summary}</p>}
      <p className={v.openingLine} aria-label="대표 수순">
        {line.san.map((san, i) => {
          const { number, white } = moveNumberOf(DEFAULT_POSITION, i + 1)
          return (
            <span key={i} className={cx(i < same ? v.lineSame : v.lineOther)}>
              {white ? `${number}.` : ''}
              {san}
            </span>
          )
        })}
      </p>
      <div className={v.openingActions}>
        <Button size="sm" onClick={() => onPractice(at)}>
          이 수순으로 연습
        </Button>
        {track.deviation && (
          <Button size="sm" tone="secondary" onClick={onBranchAtDeviation}>
            이탈 지점에서 분기
          </Button>
        )}
      </div>
    </div>
  )
}
