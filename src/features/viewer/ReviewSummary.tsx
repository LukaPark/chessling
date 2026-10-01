import { RotateCcw } from 'lucide-react'
import type { Turn } from '../../chess/types'
import { glyphColor } from '../../components/judgment.css'
import { countJudgments, JUDGMENT_META, type MoveLabel } from '../../engine/judge'
import type { GameReview } from '../../engine/review'
import * as v from '../../styles/features/viewer.css'
import { Button } from '../../ui/Button'
import { Disclosure } from '../../ui/Disclosure'

const SUMMARY_LABELS: MoveLabel[] = ['brilliant', 'great', 'best', 'miss', 'inaccuracy', 'mistake', 'blunder']
const fmt = (x: number | null) => (x === null ? '-' : `${x.toFixed(1)}%`)

export function ReviewSummary({ review, startTurn, onRerun }: { review: GameReview; startTurn: Turn; onRerun: () => void }) {
  const counts = countJudgments(review.labels, startTurn)
  return (
    <div className={v.summary}>
      <div className={v.accuracy}>
        <p className={v.accuracyItem}>
          <span className={v.accuracyLabel}>백 정확도</span>
          <span className={v.accuracyValue} data-accuracy="white">
            {fmt(review.accuracy.white)}
          </span>
        </p>
        <p className={v.accuracyItem}>
          <span className={v.accuracyLabel}>흑 정확도</span>
          <span className={v.accuracyValue} data-accuracy="black">
            {fmt(review.accuracy.black)}
          </span>
        </p>
        <Button tone="ghost" size="sm" icon={RotateCcw} onClick={onRerun}>
          리뷰 다시 실행
        </Button>
      </div>
      <Disclosure title="판정 요약">
        <table className={v.table}>
          <thead>
            <tr>
              <th scope="col" className={v.th}>
                판정
              </th>
              <th scope="col" className={v.td}>
                백
              </th>
              <th scope="col" className={v.td}>
                흑
              </th>
            </tr>
          </thead>
          <tbody>
            {SUMMARY_LABELS.map((l) => (
              <tr key={l}>
                <th scope="row" className={v.th}>
                  <span className={glyphColor[l]}>{JUDGMENT_META[l].glyph}</span> {JUDGMENT_META[l].name}
                </th>
                <td className={v.td}>{counts.white[l]}</td>
                <td className={v.td}>{counts.black[l]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Disclosure>
    </div>
  )
}
