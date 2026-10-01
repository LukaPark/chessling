import { motion } from 'motion/react'
import { winPercent, type Score } from '../engine/classify'
import { EASE } from '../ui/motion'
import * as s from './evalGraph.css'

const W = 600
const H = 100

export function EvalGraph({
  scores,
  current,
  onSelect,
  reveal = false,
}: {
  scores: (Score | null)[]
  current: number
  onSelect: (i: number) => void
  reveal?: boolean
}) {
  const n = scores.length
  if (n < 2) return null
  const step = W / (n - 1)
  const points = scores.map((sc, i) => `${i * step},${H - (sc ? winPercent(sc) : 50)}`).join(' ')
  return (
    <motion.div
      className={s.frame}
      initial={reveal ? { scaleX: 0, opacity: 0 } : false}
      animate={{ scaleX: 1, opacity: 1 }}
      transition={{ duration: 0.9, ease: EASE }}
    >
      <svg className={s.svg} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="평가 그래프">
        <polygon points={`0,${H} ${points} ${W},${H}`} className={s.area} />
        <line x1={0} x2={W} y1={H / 2} y2={H / 2} className={s.mid} />
        <line x1={current * step} x2={current * step} y1={0} y2={H} className={s.cursor} />
        {scores.map((_, i) => (
          <rect
            key={i}
            x={Math.max(0, i * step - step / 2)}
            y={0}
            width={step}
            height={H}
            fill="transparent"
            aria-hidden="true"
            data-ply={i}
            onClick={() => onSelect(i)}
          />
        ))}
      </svg>
    </motion.div>
  )
}
